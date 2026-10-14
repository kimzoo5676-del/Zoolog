package com.zoolog.auth;

import com.zoolog.member.MemberService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

// Google 로그인 성공 직후 호출. 소유자 이메일이 아니면 로그인 자체를 거절
@Component
public class OwnerOidcUserService extends OidcUserService {

    private static final String NOT_OWNER = "not_owner";

    private final MemberService memberService;
    private final String ownerEmail;

    public OwnerOidcUserService(MemberService memberService, @Value("${zoolog.owner-email}") String ownerEmail) {
        this.memberService = memberService;
        this.ownerEmail = ownerEmail;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser user = super.loadUser(userRequest);
        if (!isOwner(user)) {
            throw new OAuth2AuthenticationException(new OAuth2Error(NOT_OWNER));
        }
        memberService.loginWithGoogle(user.getSubject(), user.getEmail());
        return user;
    }

    // email_verified: Google이 소유를 확인한 이메일인지 여부. 확인 안 된 이메일은 사칭 가능
    boolean isOwner(OidcUser user) {
        return Boolean.TRUE.equals(user.getEmailVerified())
                && user.getEmail() != null
                && user.getEmail().equalsIgnoreCase(ownerEmail);
    }
}
