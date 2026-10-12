package com.zoolog.post;

import java.time.Instant;

public record PostDetailResponse(
        Long id,
        String title,
        String content,
        Long categoryId,
        String categoryName,
        String categorySlug,
        Instant createdAt,
        Instant updatedAt
) {
    public static PostDetailResponse from(Post post) {
        return new PostDetailResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getCategory().getId(),
                post.getCategory().getName(),
                post.getCategory().getSlug(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}