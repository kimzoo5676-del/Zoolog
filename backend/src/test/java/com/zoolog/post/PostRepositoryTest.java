package com.zoolog.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PostRepositoryTest {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("글을 저장하면 주제와 연결되고 생성 시각이 채워진다")
    void savesWithCategory() {
        Category category = categoryRepository.save(new Category("테스트 주제", "test-category"));
        Post saved = postRepository.save(new Post(category, "제목", "# 본문"));

        entityManager.flush();
        entityManager.clear();

        Post found = postRepository.findById(saved.getId()).orElseThrow();
        assertThat(found.getTitle()).isEqualTo("제목");
        assertThat(found.getCategory().getId()).isEqualTo(category.getId());
        assertThat(found.getCreatedAt()).isNotNull();
    }
}