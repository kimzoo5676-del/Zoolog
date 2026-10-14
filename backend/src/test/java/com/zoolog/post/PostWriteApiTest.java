package com.zoolog.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostWriteApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    PostRepository postRepository;

    @Autowired
    EntityManager entityManager;

    Category category;

    @BeforeEach
    void setUp() {
        Category top = categoryRepository.save(new Category("테스트 큰 주제", "test-top"));
        category = categoryRepository.save(new Category("테스트 주제", "test-category", top));
    }

    @Test
    @DisplayName("로그인하지 않으면 글을 작성할 수 없다")
    void createRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/posts").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "제목", "본문")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("글을 작성하면 201과 새 글 주소를 받고 DB에 저장된다")
    void create() throws Exception {
        String location = mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "제목", "# 본문")))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.title").value("제목"))
                .andExpect(jsonPath("$.categorySlug").value("test-category"))
                .andReturn().getResponse().getHeader("Location");
        entityManager.flush();
        entityManager.clear();

        Long id = Long.valueOf(location.substring(location.lastIndexOf('/') + 1));
        Post found = postRepository.findById(id).orElseThrow();
        assertThat(found.getContent()).isEqualTo("# 본문");
    }

    @Test
    @DisplayName("제목이 비어 있으면 400을 받는다")
    void createWithBlankTitle() throws Exception {
        mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), " ", "본문")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("입력값 검증에 실패하면 한국어 이유를 받는다")
    void validationMessage() throws Exception {
        mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "", "본문")))
                .andExpect(jsonPath("$.detail").value("입력값을 확인해 주세요"));
    }

    @Test
    @DisplayName("없는 주제로 글을 작성하면 400과 이유를 받는다")
    void createWithUnknownCategory() throws Exception {
        mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(-1L, "제목", "본문")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("주제를 찾을 수 없어요"));
    }

    @Test
    @DisplayName("큰 주제에는 글을 쓸 수 없고 하위 주제를 고르라는 이유를 받는다")
    void createInTopCategory() throws Exception {
        mockMvc.perform(post("/api/posts").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getParent().getId(), "제목", "본문")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("하위 주제를 골라 주세요"));
    }

    @Test
    @DisplayName("글을 수정하면 제목, 본문, 주제가 바뀐다")
    void update() throws Exception {
        Post post = postRepository.save(new Post(category, "원래 제목", "원래 본문"));
        Category other = categoryRepository.save(new Category("다른 주제", "other-category", category.getParent()));

        mockMvc.perform(put("/api/posts/{id}", post.getId()).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(other.getId(), "새 제목", "새 본문")))
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();

        Post found = postRepository.findWithCategoryById(post.getId()).orElseThrow();
        assertThat(found.getTitle()).isEqualTo("새 제목");
        assertThat(found.getContent()).isEqualTo("새 본문");
        assertThat(found.getCategory().getSlug()).isEqualTo("other-category");
    }

    @Test
    @DisplayName("수정 응답의 updatedAt은 이번 수정 시각이다")
    void updateResponseHasNewUpdatedAt() throws Exception {
        Post post = postRepository.saveAndFlush(new Post(category, "원래 제목", "원래 본문"));
        java.time.Instant before = post.getUpdatedAt();
        Thread.sleep(5);

        String response = mockMvc.perform(put("/api/posts/{id}", post.getId()).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "새 제목", "새 본문")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String updatedAt = com.jayway.jsonpath.JsonPath.read(response, "$.updatedAt");
        assertThat(java.time.Instant.parse(updatedAt)).isAfter(before);
    }

    @Test
    @DisplayName("없는 글을 수정하면 404를 받는다")
    void updateMissing() throws Exception {
        mockMvc.perform(put("/api/posts/{id}", -1).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(category.getId(), "제목", "본문")))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("글을 삭제하면 204를 받고 DB에서 사라진다")
    void deletePost() throws Exception {
        Post post = postRepository.save(new Post(category, "제목", "본문"));

        mockMvc.perform(delete("/api/posts/{id}", post.getId()).with(oidcLogin()).with(csrf()))
                .andExpect(status().isNoContent());
        entityManager.flush();
        entityManager.clear();

        assertThat(postRepository.findById(post.getId())).isEmpty();
    }

    @Test
    @DisplayName("CSRF 토큰 없이 글을 삭제하면 403을 받는다")
    void deleteWithoutCsrf() throws Exception {
        Post post = postRepository.save(new Post(category, "제목", "본문"));

        mockMvc.perform(delete("/api/posts/{id}", post.getId()).with(oidcLogin()))
                .andExpect(status().isForbidden());
    }

    private static String body(Long categoryId, String title, String content) {
        return """
                {"categoryId": %d, "title": "%s", "content": "%s"}
                """.formatted(categoryId, title, content);
    }
}
