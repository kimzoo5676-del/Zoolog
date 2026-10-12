package com.zoolog.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class CategoryWriteApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CategoryRepository categoryRepository;

    @Test
    @DisplayName("주제를 추가하면 201과 이름에서 만든 slug를 받는다")
    void create() throws Exception {
        mockMvc.perform(post("/api/categories").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("  Test Category  ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Category"))
                .andExpect(jsonPath("$.slug").value("test-category"));
    }

    @Test
    @DisplayName("이미 있는 이름이면 409와 이유를 받는다")
    void duplicateName() throws Exception {
        categoryRepository.save(new Category("테스트 주제", "테스트-주제"));

        mockMvc.perform(post("/api/categories").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("테스트 주제")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("이미 있는 주제예요"));
    }

    @Test
    @DisplayName("이름은 달라도 slug가 같아지면 409를 받는다")
    void duplicateSlug() throws Exception {
        categoryRepository.save(new Category("Test Category", "test-category"));

        mockMvc.perform(post("/api/categories").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("test category")))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("글자나 숫자가 없는 이름이면 400을 받는다")
    void nameWithoutLetters() throws Exception {
        mockMvc.perform(post("/api/categories").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("!!!")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("slug는 소문자로 바꾸고 한글은 유지하며 기호 묶음은 하이픈 하나로 만든다")
    void toSlug() {
        assertThat(CategoryService.toSlug("AWS SAA")).isEqualTo("aws-saa");
        assertThat(CategoryService.toSlug("토익 스피킹")).isEqualTo("토익-스피킹");
        assertThat(CategoryService.toSlug("C++ / Java!")).isEqualTo("c-java");
    }

    private static String body(String name) {
        return """
                {"name": "%s"}
                """.formatted(name);
    }
}
