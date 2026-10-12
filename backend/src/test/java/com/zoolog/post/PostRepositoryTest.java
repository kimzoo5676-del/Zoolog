package com.zoolog.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
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

    @Test
    @DisplayName("상위 주제 slug로 조회하면 그 아래 모든 단계의 주제 글이 함께 나온다")
    void findsPostsIncludingSubcategories() {
        Category parent = categoryRepository.save(new Category("Test Parent", "test-parent"));
        Category child = categoryRepository.save(new Category("Test Child", "test-child", parent));
        Category grandchild = categoryRepository.save(new Category("Test Grandchild", "test-grandchild", child));
        Category other = categoryRepository.save(new Category("Test Other", "test-other"));
        postRepository.save(new Post(parent, "큰 주제 글", "본문"));
        postRepository.save(new Post(child, "하위 주제 글", "본문"));
        postRepository.save(new Post(grandchild, "3단계 주제 글", "본문"));
        postRepository.save(new Post(other, "다른 주제 글", "본문"));
        entityManager.flush();
        entityManager.clear();

        List<String> parentTitles = postRepository.findAllWithCategoryBySlug("test-parent").stream()
                .map(Post::getTitle)
                .toList();
        List<String> childTitles = postRepository.findAllWithCategoryBySlug("test-child").stream()
                .map(Post::getTitle)
                .toList();

        assertThat(parentTitles).containsExactlyInAnyOrder("큰 주제 글", "하위 주제 글", "3단계 주제 글");
        assertThat(childTitles).containsExactlyInAnyOrder("하위 주제 글", "3단계 주제 글");
    }
}
