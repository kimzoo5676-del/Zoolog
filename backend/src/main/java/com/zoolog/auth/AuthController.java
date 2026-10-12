package com.zoolog.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // 비로그인은 오류가 아닌 정상 상태라 401 대신 204 (방문자 화면마다 콘솔 오류가 찍히지 않도록)
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(@AuthenticationPrincipal OidcUser user) {
        if (user == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(MeResponse.from(user));
    }
}
