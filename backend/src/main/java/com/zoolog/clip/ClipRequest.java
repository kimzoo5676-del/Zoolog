package com.zoolog.clip;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

// 아침 기사 메일의 "코멘트 쓰기" 링크로 채워진 기사 정보 + 소유자 코멘트
// date: 기사 메일을 받은 날 (주제·글 제목의 날짜)
public record ClipRequest(
        @NotBlank @Size(max = 300) String title,
        @NotBlank @Size(max = 2000) String url,
        @Size(max = 100) String source,
        @NotNull LocalDate date,
        // 본문(마크다운): 일반 글 본문처럼 길이 제한 없음 (2026-10-15 소유자 결정, 이전 500자)
        @NotBlank String comment
) {
}
