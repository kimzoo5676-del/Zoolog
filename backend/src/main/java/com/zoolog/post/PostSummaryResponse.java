package com.zoolog.post;

import java.time.Instant;

public record PostSummaryResponse(
        Long id,
        String title,
        String categoryName,
        String categorySlug,
        Instant createdAt
) {
    public static PostSummaryResponse from(Post post) {
        return new PostSummaryResponse(
                post.getId(),
                post.getTitle(),
                post.getCategory().getName(),
                post.getCategory().getSlug(),
                post.getCreatedAt()
        );
    }
}