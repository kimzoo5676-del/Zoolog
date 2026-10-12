package com.zoolog.auth;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthSecurityTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    @DisplayName("비로그인 상태에서 내 정보를 조회하면 204를 받는다")
    void meWhenAnonymous() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("로그인 상태에서 내 정보를 조회하면 이메일을 받는다")
    void meWhenLoggedIn() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .with(oidcLogin().idToken(token -> token.claim("email", "owner@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("owner@example.com"));
    }

    @Test
    @DisplayName("GET 요청 응답에 CSRF 토큰 쿠키가 담긴다")
    void issuesCsrfCookie() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(cookie().exists("XSRF-TOKEN"));
    }

    @Test
    @DisplayName("비로그인 상태의 API 쓰기 요청은 로그인 페이지 이동 대신 401을 받는다")
    void apiRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/posts").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CSRF 토큰 없이 로그아웃하면 403을 받는다")
    void logoutWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/auth/logout").with(oidcLogin()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CSRF 토큰과 함께 로그아웃하면 204를 받는다")
    void logoutWithCsrf() throws Exception {
        mockMvc.perform(post("/api/auth/logout").with(oidcLogin()).with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Google 로그인 시작 주소는 Google 동의 화면으로 이동시킨다")
    void startsGoogleLogin() throws Exception {
        mockMvc.perform(get("/oauth2/authorization/google"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", startsWith("https://accounts.google.com/")));
    }
}
