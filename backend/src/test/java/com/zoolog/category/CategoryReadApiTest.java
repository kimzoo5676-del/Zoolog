package com.zoolog.category;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CategoryReadApiTest {

    @Autowired
    CategoryService categoryService;

    @Autowired
    CategoryRepository categoryRepository;

    @Test
    @DisplayName("주제 목록은 이름순이 아니라 만든 순서로 나온다")
    void ordersByCreation() {
        categoryRepository.save(new Category("Zeta Test", "zeta-test"));
        categoryRepository.save(new Category("Alpha Test", "alpha-test"));

        List<String> names = categoryService.findAll().stream()
                .map(CategoryResponse::name)
                .filter((name) -> name.endsWith(" Test"))
                .toList();

        assertThat(names).containsExactly("Zeta Test", "Alpha Test");
    }
}
