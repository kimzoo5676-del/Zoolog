package com.zoolog.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import com.zoolog.support.TestCategories;
import com.zoolog.post.Post;
import jakarta.persistence.EntityManager;
import java.io.ByteArrayInputStream;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ImageApiTest {

    // PNG 파일 서명 + 임의 바이트
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};

    @Autowired
    MockMvc mockMvc;

    @Autowired
    PostImageRepository postImageRepository;

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    EntityManager entityManager;

    // 실제 저장소(SeaweedFS)에 파일을 남기지 않도록 가짜로 대체
    @MockitoBean
    ImageStorage storage;

    @Test
    @DisplayName("PNG를 올리면 201과 이미지 주소를 받고 저장소에 저장된다")
    void uploadPng() throws Exception {
        mockMvc.perform(multipart("/api/images").file(new MockMultipartFile("file", "a.png", "image/png", PNG))
                        .with(oidcLogin()).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.matchesPattern("/api/images/[0-9a-f-]{36}\\.png")));

        verify(storage).put(startsWith("images/"), eq("image/png"), any());
    }

    @Test
    @DisplayName("확장자를 바꿔도 이미지 서명이 아니면 415를 받는다")
    void rejectNonImage() throws Exception {
        mockMvc.perform(multipart("/api/images")
                        .file(new MockMultipartFile("file", "fake.png", "image/png", "hello".getBytes()))
                        .with(oidcLogin()).with(csrf()))
                .andExpect(status().isUnsupportedMediaType());

        verify(storage, never()).put(any(), any(), any());
    }

    @Test
    @DisplayName("로그인하지 않으면 이미지를 올릴 수 없다")
    void uploadRequiresLogin() throws Exception {
        mockMvc.perform(multipart("/api/images").file(new MockMultipartFile("file", "a.png", "image/png", PNG)).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("올린 이미지는 누구나 볼 수 있고 1년 캐시 헤더가 붙는다")
    void serveImage() throws Exception {
        String url = upload();
        given(storage.get(any())).willReturn(new ResponseInputStream<>(
                GetObjectResponse.builder().build(), AbortableInputStream.create(new ByteArrayInputStream(PNG))));

        mockMvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andExpect(content().bytes(PNG));
    }

    @Test
    @DisplayName("글 본문에 쓴 이미지는 글과 연결되고, 본문에서 빼면 연결이 풀리며, 이미지가 있는 글도 삭제된다")
    void syncWithPost() throws Exception {
        String url = upload();
        String key = "images/" + url.substring(url.lastIndexOf('/') + 1);
        Category category = TestCategories.subCategory(categoryRepository);

        String created = mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "![](" + url + ")")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Integer postId = JsonPath.read(created, "$.id");
        entityManager.flush();
        entityManager.clear();
        assertThat(linkedPostIds(key)).containsExactly(postId.longValue());

        mockMvc.perform(put("/api/posts/{id}", postId).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "이미지 없는 본문")))
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        assertThat(linkedPostIds(key)).isEmpty();
        assertThat(postImageRepository.findByObjectKey(key).orElseThrow().getUnusedSince()).isNotNull();

        mockMvc.perform(put("/api/posts/{id}", postId).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "![](" + url + ")")))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/posts/{id}", postId).with(oidcLogin()).with(csrf()))
                .andExpect(status().isNoContent());
        entityManager.flush();
        entityManager.clear();
        assertThat(linkedPostIds(key)).isEmpty();
    }

    @Test
    @DisplayName("한 이미지를 두 글이 함께 쓰면, 한 글에서 빼도 다른 글과의 연결은 남아 정리 대상이 아니다")
    void shareImageBetweenPosts() throws Exception {
        String url = upload();
        String key = "images/" + url.substring(url.lastIndexOf('/') + 1);
        Category category = TestCategories.subCategory(categoryRepository);
        Integer first = createPost(category.getId(), "![](" + url + ")");
        Integer second = createPost(category.getId(), "같은 이미지 ![](" + url + ")");
        entityManager.flush();
        entityManager.clear();
        assertThat(linkedPostIds(key)).containsExactlyInAnyOrder(first.longValue(), second.longValue());

        mockMvc.perform(put("/api/posts/{id}", second).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "이미지 없는 본문")))
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();

        assertThat(linkedPostIds(key)).containsExactly(first.longValue());
        assertThat(postImageRepository.findByObjectKey(key).orElseThrow().getUnusedSince()).isNull();
    }

    private Integer createPost(Long categoryId, String content) throws Exception {
        String created = mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(categoryId, content)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.id");
    }

    private List<Long> linkedPostIds(String key) {
        return postImageRepository.findByObjectKey(key).orElseThrow().getPosts().stream().map(Post::getId).toList();
    }

    private String upload() throws Exception {
        String response = mockMvc.perform(multipart("/api/images")
                        .file(new MockMultipartFile("file", "a.png", "image/png", PNG))
                        .with(oidcLogin()).with(csrf()))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.url");
    }

    private static String body(Long categoryId, String content) {
        return """
                {"categoryId": %d, "title": "제목", "content": "%s"}
                """.formatted(categoryId, content);
    }
}
