package com.zoolog.category;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CategoryRepositoryTest {

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    @DisplayName("주제를 저장하면 생성 시각과 수정 시각이 자동으로 채워진다")
    void savesWithAuditingTimestamps() {
        Category saved = categoryRepository.save(new Category("AWS-SAA", "aws-saa"));
        entityManager.flush();
        entityManager.clear();

        Category found = categoryRepository.findById(saved.getId()).orElseThrow();

        assertThat(found.getCreatedAt()).isNotNull();
        assertThat(found.getUpdatedAt()).isNotNull();
    }
}