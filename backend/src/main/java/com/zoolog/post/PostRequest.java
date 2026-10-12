package com.zoolog.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// 글 작성·수정 공용 요청 본문
public record PostRequest(
        @NotNull Long categoryId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content
) {
}
