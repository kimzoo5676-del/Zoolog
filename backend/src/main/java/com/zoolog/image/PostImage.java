package com.zoolog.image;

import com.zoolog.global.entity.BaseTimeEntity;
import com.zoolog.post.Post;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "post_image")
public class PostImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 이 이미지를 본문에 쓴 글들 (한 이미지를 여러 글이 함께 쓸 수 있음, V6). 올린 직후(작성 중)에는 비어 있음
    @ManyToMany
    @JoinTable(name = "post_image_link",
            joinColumns = @JoinColumn(name = "post_image_id"),
            inverseJoinColumns = @JoinColumn(name = "post_id"))
    private Set<Post> posts = new HashSet<>();

    // 연결된 글이 하나도 없게 된 시각 (연결돼 있으면 null): 정리 작업이 이 시각부터 유예 기간을 셈
    private Instant unusedSince;

    // 저장소 안 파일 이름 (예: images/3f2a....png), 화면 주소는 /api/images/{파일 이름}
    @Column(nullable = false, unique = true, length = 300)
    private String objectKey;

    @Column(nullable = false, length = 50)
    private String contentType;

    protected PostImage() {
    }

    public PostImage(String objectKey, String contentType, Instant uploadedAt) {
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.unusedSince = uploadedAt;
    }

    public void linkTo(Post post) {
        posts.add(post);
        unusedSince = null;
    }

    // 마지막 글에서 빠지면 그때부터 정리 대상 유예 기간 시작
    public void unlinkFrom(Post post, Instant now) {
        posts.remove(post);
        if (posts.isEmpty() && unusedSince == null) {
            unusedSince = now;
        }
    }

    public Long getId() {
        return id;
    }

    public Set<Post> getPosts() {
        return Set.copyOf(posts);
    }

    public Instant getUnusedSince() {
        return unusedSince;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getContentType() {
        return contentType;
    }
}
