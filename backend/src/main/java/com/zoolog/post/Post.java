package com.zoolog.post;

import com.zoolog.category.Category;
import com.zoolog.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.Instant;

@Entity
public class Post extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 목차용으로 미리 만든 글의 본문 (아직 쓰지 않은 글)
    static final String PLACEHOLDER = "작성 예정";

    // 실제로 쓴 시각: Streak·글 날짜·최신순 정렬 기준. '작성 예정' 글은 null, 처음 내용을 채운 순간 정해짐 (V9)
    private Instant publishedAt;

    protected Post() {
    }

    public Post(Category category, String title, String content) {
        this.category = category;
        this.title = title;
        this.content = content;
    }

    public void update(Category category, String title, String content) {
        this.category = category;
        this.title = title;
        this.content = content;
    }

    // 아직 쓴 시각이 없고 본문이 '작성 예정'이 아니면 지금을 쓴 시각으로 (한 번 정해지면 수정해도 그대로)
    public void publishIfWritten(Instant now) {
        if (publishedAt == null && !PLACEHOLDER.equals(content.strip())) {
            publishedAt = now;
        }
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Long getId() {
        return id;
    }

    public Category getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }
}