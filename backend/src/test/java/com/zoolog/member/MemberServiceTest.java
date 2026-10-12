package com.zoolog.member;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class MemberServiceTest {

    @Autowired
    MemberService memberService;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    @DisplayName("처음 Google로 로그인하면 회원이 저장된다")
    void savesMemberOnFirstLogin() {
        Member saved = memberService.loginWithGoogle("google-sub-1", "owner@example.com");
        entityManager.flush();
        entityManager.clear();

        Member found = memberRepository.findById(saved.getId()).orElseThrow();

        assertThat(found.getGoogleSub()).isEqualTo("google-sub-1");
        assertThat(found.getEmail()).isEqualTo("owner@example.com");
        assertThat(found.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("같은 Google 계정으로 다시 로그인하면 새로 저장하지 않고 이메일만 갱신한다")
    void updatesEmailOnNextLogin() {
        Member first = memberService.loginWithGoogle("google-sub-1", "old@example.com");
        entityManager.flush();
        entityManager.clear();

        Member second = memberService.loginWithGoogle("google-sub-1", "new@example.com");
        entityManager.flush();
        entityManager.clear();

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(memberRepository.findById(first.getId()).orElseThrow().getEmail()).isEqualTo("new@example.com");
    }
}
