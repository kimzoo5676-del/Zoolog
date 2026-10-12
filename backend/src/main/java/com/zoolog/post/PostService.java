package com.zoolog.post;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
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
        Post post = postRepository.findWithCategoryById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요"));
        return PostDetailResponse.from(post);
    }
}