package com.zoolog.clip;

// 이미 스크랩한 기사: 그 글 번호
public record ClipLookupResponse(Long postId) {

    static ClipLookupResponse from(NewsClip clip) {
        return new ClipLookupResponse(clip.getPost().getId());
    }
}
