package com.zoolog.post;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostSummaryResponse> findAll(@RequestParam(required = false) String category) {
        return postService.findAll(category);
    }

    @GetMapping("/{id}")
    public PostDetailResponse findById(@PathVariable Long id) {
        return postService.findById(id);
    }
}