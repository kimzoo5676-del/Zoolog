package com.zoolog.post;

import java.time.Instant;

public record PostSummaryResponse(
        Long id,
        String title,
        String categoryName,
        String categorySlug,
        Instant createdAt,
        // 실제로 쓴 시각 ('작성 예정' 글은 null): Streak과 글 날짜 기준
        Instant publishedAt
) {
    public static PostSummaryResponse from(Post post) {
        return new PostSummaryResponse(
                post.getId(),
                post.getTitle(),
                post.getCategory().getName(),
                post.getCategory().getSlug(),
                post.getCreatedAt(),
                post.getPublishedAt()
        );
    }
}