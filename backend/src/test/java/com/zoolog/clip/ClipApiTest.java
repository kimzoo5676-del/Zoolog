package com.zoolog.clip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import com.zoolog.post.PostRepository;
import jakarta.persistence.EntityManager;
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
class ClipApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    PostRepository postRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    @DisplayName("코멘트를 게시하면 News Clipping > 달 > 주 주제 아래에 날짜 + 기사 제목 글이 생긴다")
    void createClip() throws Exception {
        String response = mockMvc.perform(post("/api/clips").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("AWS [서울] 리전 확장", "https://news.example.com/a?id=1", "한겨레", "2026-10-14",
                                "클라우드 수요가 늘고 있다는 신호.")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/posts/")))
                .andExpect(jsonPath("$.title").value("10.14 AWS [서울] 리전 확장"))
                .andReturn().getResponse().getContentAsString();
        entityManager.flush();
        entityManager.clear();

        Integer postId = JsonPath.read(response, "$.id");
        var post = postRepository.findWithCategoryById(postId.longValue()).orElseThrow();
        Category week = post.getCategory();
        assertThat(week.getName()).isEqualTo("2026.10 Week 3");
        assertThat(week.getParent().getName()).isEqualTo("2026.10");
        assertThat(week.getParent().getParent().getName()).isEqualTo("News Clipping");
        assertThat(post.getContent()).isEqualTo(
                "[AWS \\[서울\\] 리전 확장](<https://news.example.com/a?id=1>) · 한겨레\n\n클라우드 수요가 늘고 있다는 신호.\n");
    }

    @Test
    @DisplayName("같은 주의 두 번째 코멘트는 이미 있는 주제를 다시 쓴다")
    void reuseCategories() throws Exception {
        clip("2026-10-13", "https://a.com/1");
        long before = categoryRepository.count();

        clip("2026-10-18", "https://a.com/2");

        assertThat(categoryRepository.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("http·https가 아닌 기사 주소는 400을 받는다")
    void rejectNonHttpUrl() throws Exception {
        mockMvc.perform(post("/api/clips").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("제목", "javascript:alert(1)", "", "2026-10-14", "코멘트")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("기사 주소를 확인해 주세요"));
    }

    @Test
    @DisplayName("로그인하지 않으면 게시할 수 없다")
    void requiresLogin() throws Exception {
        mockMvc.perform(post("/api/clips").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("제목", "https://a.com", "", "2026-10-14", "코멘트")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("주는 월요일 시작이고 1일이 들어 있는 주가 Week 1이다")
    void weekName() {
        // 2026-10-01은 목요일: 1~4일이 Week 1, 5일(월)부터 Week 2
        assertThat(ClipService.weekName(java.time.LocalDate.of(2026, 10, 4))).isEqualTo("2026.10 Week 1");
        assertThat(ClipService.weekName(java.time.LocalDate.of(2026, 10, 5))).isEqualTo("2026.10 Week 2");
        assertThat(ClipService.weekName(java.time.LocalDate.of(2026, 10, 31))).isEqualTo("2026.10 Week 5");
    }

    @Test
    @DisplayName("같은 기사를 다시 스크랩하면 409를 받고, 조회하면 먼저 쓴 글 번호가 나온다")
    void rejectDuplicate() throws Exception {
        Integer postId = clip("2026-10-14", "https://a.com/dup");

        mockMvc.perform(post("/api/clips").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("기사", "https://a.com/dup", "", "2026-10-15", "또 코멘트")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("이미 스크랩한 기사예요"));
        mockMvc.perform(get("/api/clips").param("url", "https://a.com/dup").with(oidcLogin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postId").value(postId));
        mockMvc.perform(get("/api/clips").param("url", "https://a.com/new").with(oidcLogin()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("스크랩 글을 지우면 같은 기사를 다시 스크랩할 수 있다")
    void clipAgainAfterDelete() throws Exception {
        Integer postId = clip("2026-10-14", "https://a.com/again");
        mockMvc.perform(delete("/api/posts/{id}", postId).with(oidcLogin()).with(csrf()))
                .andExpect(status().isNoContent());
        entityManager.flush();
        entityManager.clear();

        clip("2026-10-14", "https://a.com/again");
    }

    private Integer clip(String date, String url) throws Exception {
        String response = mockMvc.perform(post("/api/clips").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("기사", url, "", date, "코멘트")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private static String body(String title, String url, String source, String date, String comment) {
        return """
                {"title": "%s", "url": "%s", "source": "%s", "date": "%s", "comment": "%s"}
                """.formatted(title, url, source, date, comment);
    }
}
