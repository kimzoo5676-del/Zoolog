package com.zoolog.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import com.zoolog.post.Post;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ImageCleanupTest {

    @Autowired
    ImageService imageService;

    @Autowired
    PostImageRepository postImageRepository;

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    EntityManager entityManager;

    // 개발 저장소의 실제 파일을 지우지 않도록 가짜로 대체 (DB 기록은 테스트 끝에 롤백)
    @MockitoBean
    ImageStorage storage;

    // 저장 시각(updatedAt)은 실제 시각, 정리 기준 "지금"만 앞으로 옮김
    @MockitoBean
    Clock clock;

    @Test
    @DisplayName("글과 연결되지 않은 채 7일이 지난 이미지는 저장소 파일과 기록이 함께 삭제된다")
    void deleteOldUnusedImage() {
        PostImage unused = save(new PostImage(newKey(), "image/png"));
        nowIs(Instant.now().plus(ImageService.UNUSED_GRACE).plus(Duration.ofHours(1)));

        imageService.deleteUnusedImages();
        entityManager.flush();
        entityManager.clear();

        verify(storage).delete(unused.getObjectKey());
        assertThat(postImageRepository.findByObjectKey(unused.getObjectKey())).isEmpty();
    }

    @Test
    @DisplayName("연결이 없어도 7일이 지나지 않은 이미지는 남는다")
    void keepRecentUnusedImage() {
        PostImage recent = save(new PostImage(newKey(), "image/png"));
        nowIs(Instant.now().plus(ImageService.UNUSED_GRACE).minus(Duration.ofHours(1)));

        imageService.deleteUnusedImages();
        entityManager.flush();
        entityManager.clear();

        verify(storage, never()).delete(recent.getObjectKey());
        assertThat(postImageRepository.findByObjectKey(recent.getObjectKey())).isPresent();
    }

    @Test
    @DisplayName("글에 연결된 이미지는 오래돼도 남는다")
    void keepAttachedImage() {
        Category top = categoryRepository.save(new Category("테스트 큰 주제", "test-top"));
        Category category = categoryRepository.save(new Category("테스트 주제", "test-category", top));
        Post post = new Post(category, "제목", "본문");
        entityManager.persist(post);
        PostImage attached = new PostImage(newKey(), "image/png");
        attached.attachTo(post);
        save(attached);
        nowIs(Instant.now().plus(Duration.ofDays(365)));

        imageService.deleteUnusedImages();
        entityManager.flush();
        entityManager.clear();

        verify(storage, never()).delete(attached.getObjectKey());
        assertThat(postImageRepository.findByObjectKey(attached.getObjectKey())).isPresent();
    }

    private PostImage save(PostImage image) {
        PostImage saved = postImageRepository.save(image);
        entityManager.flush();
        return saved;
    }

    private void nowIs(Instant now) {
        given(clock.instant()).willReturn(now);
    }

    private static String newKey() {
        return "images/" + UUID.randomUUID() + ".png";
    }
}
