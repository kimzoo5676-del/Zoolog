package com.zoolog.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

class OwnerOidcUserServiceTest {

    // isOwner는 DB를 쓰지 않으므로 MemberService 없이 생성
    OwnerOidcUserService service = new OwnerOidcUserService(null, "owner@example.com");

    @Test
    @DisplayName("Google이 확인한 소유자 이메일이면 소유자로 판단한다")
    void ownerWithVerifiedEmail() {
        assertThat(service.isOwner(user("owner@example.com", true))).isTrue();
    }

    @Test
    @DisplayName("이메일 대소문자가 달라도 소유자로 판단한다")
    void ownerIgnoringCase() {
        assertThat(service.isOwner(user("Owner@Example.com", true))).isTrue();
    }

    @Test
    @DisplayName("다른 이메일이면 소유자가 아니다")
    void otherEmail() {
        assertThat(service.isOwner(user("visitor@example.com", true))).isFalse();
    }

    @Test
    @DisplayName("Google이 확인하지 않은 이메일이면 소유자 이메일이어도 거절한다")
    void unverifiedEmail() {
        assertThat(service.isOwner(user("owner@example.com", false))).isFalse();
    }

    @Test
    @DisplayName("이메일이 없는 계정은 소유자가 아니다")
    void missingEmail() {
        assertThat(service.isOwner(user(null, null))).isFalse();
    }

    private static OidcUser user(String email, Boolean emailVerified) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", "google-sub-1");
        if (email != null) {
            claims.put("email", email);
        }
        if (emailVerified != null) {
            claims.put("email_verified", emailVerified);
        }
        Instant now = Instant.now();
        OidcIdToken idToken = new OidcIdToken("token", now, now.plusSeconds(60), claims);
        return new DefaultOidcUser(List.of(), idToken);
    }
}
