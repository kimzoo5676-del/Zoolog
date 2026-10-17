package com.zoolog.post;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
import com.zoolog.image.ImageService;
import java.time.Clock;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final ImageService imageService;
    private final Clock clock;

    public PostService(PostRepository postRepository, CategoryRepository categoryRepository, ImageService imageService,
            Clock clock) {
        this.postRepository = postRepository;
        this.categoryRepository = categoryRepository;
        this.imageService = imageService;
        this.clock = clock;
    }

    public List<PostSummaryResponse> findAll(String categorySlug) {
        List<Post> posts = (categorySlug == null)
                ? postRepository.findAllWithCategory()
                : postRepository.findAllWithCategoryBySlug(categorySlug);
        return posts.stream()
                .map(PostSummaryResponse::from)
                .toList();
    }

    public PostDetailResponse findById(Long id) {
        return PostDetailResponse.from(getPostWithCategory(id));
    }

    @Transactional
    public PostDetailResponse create(PostRequest request) {
        Category category = getCategory(request.categoryId());
        Post post = new Post(category, request.title(), request.content());
        post.publishIfWritten(clock.instant());
        postRepository.save(post);
        imageService.syncImages(post);
        return PostDetailResponse.from(post);
    }

    // 변경 감지(dirty checking): 트랜잭션이 끝날 때 바뀐 필드를 UPDATE, save 호출 불필요
    @Transactional
    public PostDetailResponse update(Long id, PostRequest request) {
        Post post = getPostWithCategory(id);
        post.update(getCategory(request.categoryId()), request.title(), request.content());
        // '작성 예정' 글을 처음 채우면 지금이 쓴 날 (Streak에 그날로 찍힘)
        post.publishIfWritten(clock.instant());
        imageService.syncImages(post);
        // 수정 시각(@LastModifiedDate)은 DB 반영(flush) 때 정해지므로 먼저 반영한 뒤 응답을 만듦 (안 하면 이전 updatedAt)
        postRepository.flush();
        return PostDetailResponse.from(post);
    }

    @Transactional
    public void delete(Long id) {
        Post post = getPostWithCategory(id);
        // 글-이미지 연결이 글을 참조(FK)하므로 먼저 연결 해제 (저장소 파일은 남김, 다른 글이 안 쓰면 정리 작업이 삭제)
        imageService.unlinkAll(post);
        postRepository.delete(post);
    }

    private Post getPostWithCategory(Long id) {
        return postRepository.findWithCategoryById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요"));
    }

    // 요청 본문의 값이 잘못된 경우라 404가 아닌 400
    // 글은 하위 주제(2단계 이상)에만 쓸 수 있음 (2026-10-13 소유자 결정: 큰 주제 화면은 하위 주제 칸만 보여 주므로)
    private Category getCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "주제를 찾을 수 없어요"));
        if (category.getParent() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "하위 주제를 골라 주세요");
        }
        return category;
    }
}
