package com.zoolog.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// slug는 이름에서 자동 생성 (CategoryService). parentId가 없으면 큰 주제
public record CategoryRequest(@NotBlank @Size(max = 50) String name, Long parentId) {
}
