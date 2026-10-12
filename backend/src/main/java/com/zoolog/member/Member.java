package com.zoolog.member;

import com.zoolog.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Member extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Google 계정 고유 ID (ID 토큰의 sub). 이메일은 바뀔 수 있어 식별에는 sub 사용
    @Column(nullable = false, unique = true)
    private String googleSub;

    @Column(nullable = false, length = 320)
    private String email;

    protected Member() {
    }

    public Member(String googleSub, String email) {
        this.googleSub = googleSub;
        this.email = email;
    }

    public void changeEmail(String email) {
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public String getEmail() {
        return email;
    }
}
