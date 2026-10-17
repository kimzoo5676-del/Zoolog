package com.zoolog.support;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;

// 테스트용 주제: 글은 하위 주제에만 쓸 수 있어 큰 주제 + 하위 주제를 함께 만듦 (테스트 트랜잭션이 끝나면 롤백)
public final class TestCategories {

    private TestCategories() {
    }

    public static Category subCategory(CategoryRepository categoryRepository) {
        Category top = categoryRepository.save(new Category("테스트 큰 주제", "test-top"));
        return categoryRepository.save(new Category("테스트 주제", "test-category", top));
    }
}
