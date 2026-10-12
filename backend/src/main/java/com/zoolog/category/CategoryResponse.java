package com.zoolog.category;

// parentId가 null이면 큰 주제. 화면이 목록을 받아 2단계 구조로 묶음
public record CategoryResponse(Long id, String name, String slug, Long parentId) {

    // getParent().getId()는 프록시 초기화 없이 FK 값만 읽음 (추가 쿼리 없음)
    public static CategoryResponse from(Category category) {
        Long parentId = category.isTopLevel() ? null : category.getParent().getId();
        return new CategoryResponse(category.getId(), category.getName(), category.getSlug(), parentId);
    }
}
