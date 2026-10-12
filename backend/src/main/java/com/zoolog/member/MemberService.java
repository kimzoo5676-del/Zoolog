package com.zoolog.member;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    // 첫 로그인이면 저장, 이후에는 Google 쪽에서 바뀐 이메일만 반영
    @Transactional
    public Member loginWithGoogle(String googleSub, String email) {
        return memberRepository.findByGoogleSub(googleSub)
                .map(member -> {
                    member.changeEmail(email);
                    return member;
                })
                .orElseGet(() -> memberRepository.save(new Member(googleSub, email)));
    }
}
