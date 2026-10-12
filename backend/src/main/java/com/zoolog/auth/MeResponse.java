package com.zoolog.auth;

import org.springframework.security.oauth2.core.oidc.user.OidcUser;

public record MeResponse(String email) {

    public static MeResponse from(OidcUser user) {
        return new MeResponse(user.getEmail());
    }
}
