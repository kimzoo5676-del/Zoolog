package com.zoolog.global.config;

import com.zoolog.auth.OwnerOidcUserService;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, OwnerOidcUserService ownerOidcUserService)
            throws Exception {
        http.authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/**", "/api/posts", "/api/posts/**",
                                "/api/auth/me").permitAll()
                        .anyRequest().authenticated())
                // /oauth2/authorization/google → Google 동의 화면 → /login/oauth2/code/google 콜백 → 세션 발급
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/login")
                        .userInfoEndpoint(userInfo -> userInfo.oidcUserService(ownerOidcUserService))
                        .defaultSuccessUrl("/", true)
                        .failureUrl("/login?error"))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                // XSRF-TOKEN 쿠키(JS에서 읽기 가능) → 프론트가 X-XSRF-TOKEN 헤더로 되돌려 보냄
                .csrf(csrf -> csrf.spa())
                // API는 로그인 페이지로 리다이렉트하지 않고 401
                .exceptionHandling(exception -> exception.defaultAuthenticationEntryPointFor(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                        PathPatternRequestMatcher.pathPattern("/api/**")))
                // 거절된 요청을 세션에 저장하지 않음 (방문자에게 불필요한 JSESSIONID 발급 방지)
                .requestCache(cache -> cache.requestCache(new NullRequestCache()));
        return http.build();
    }
}
