package com.zoolog.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// slug는 이름에서 자동 생성 (CategoryService)
public record CategoryRequest(@NotBlank @Size(max = 50) String name) {
}
