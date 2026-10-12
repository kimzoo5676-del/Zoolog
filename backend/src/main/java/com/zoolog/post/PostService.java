package com.zoolog.post;

import com.zoolog.category.Category;
import com.zoolog.category.CategoryRepository;
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

    public PostService(PostRepository postRepository, CategoryRepository categoryRepository) {
        this.postRepository = postRepository;
        this.categoryRepository = categoryRepository;
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
        Post post = postRepository.save(new Post(category, request.title(), request.content()));
        return PostDetailResponse.from(post);
    }

    // 변경 감지(dirty checking): 트랜잭션이 끝날 때 바뀐 필드를 UPDATE, save 호출 불필요
    @Transactional
    public PostDetailResponse update(Long id, PostRequest request) {
        Post post = getPostWithCategory(id);
        post.update(getCategory(request.categoryId()), request.title(), request.content());
        return PostDetailResponse.from(post);
    }

    @Transactional
    public void delete(Long id) {
        postRepository.delete(getPostWithCategory(id));
    }

    private Post getPostWithCategory(Long id) {
        return postRepository.findWithCategoryById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요"));
    }

    // 요청 본문의 값이 잘못된 경우라 404가 아닌 400
    private Category getCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "주제를 찾을 수 없어요"));
    }
}
