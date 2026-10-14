package com.zoolog.clip;

import com.zoolog.global.entity.BaseTimeEntity;
import com.zoolog.post.Post;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

// 스크랩한 기사 주소와 그 글: 같은 기사를 두 번 스크랩하지 않도록. 글을 지우면 DB가 함께 지움(V8 ON DELETE CASCADE)
@Entity
public class NewsClip extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 2000)
    private String url;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Post post;

    protected NewsClip() {
    }

    public NewsClip(String url, Post post) {
        this.url = url;
        this.post = post;
    }

    public Post getPost() {
        return post;
    }
}
