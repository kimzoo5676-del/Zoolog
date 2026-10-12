package com.zoolog.image;

import com.zoolog.global.entity.BaseTimeEntity;
import com.zoolog.post.Post;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "post_image")
public class PostImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 올린 직후에는 글이 없음(작성 중). 글 저장 시 본문에 쓰인 이미지만 연결
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    // 저장소 안 파일 이름 (예: images/3f2a....png), 화면 주소는 /api/images/{파일 이름}
    @Column(nullable = false, unique = true, length = 300)
    private String objectKey;

    @Column(nullable = false, length = 50)
    private String contentType;

    protected PostImage() {
    }

    public PostImage(String objectKey, String contentType) {
        this.objectKey = objectKey;
        this.contentType = contentType;
    }

    public void attachTo(Post post) {
        this.post = post;
    }

    public void detach() {
        this.post = null;
    }

    public Long getId() {
        return id;
    }

    public Post getPost() {
        return post;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getContentType() {
        return contentType;
    }
}
