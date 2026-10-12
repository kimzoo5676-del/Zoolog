package com.zoolog.post;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
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

    // 201 Created + Location 헤더(새 글 주소)
    @PostMapping
    public ResponseEntity<PostDetailResponse> create(@Valid @RequestBody PostRequest request) {
        PostDetailResponse created = postService.create(request);
        return ResponseEntity.created(URI.create("/api/posts/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public PostDetailResponse update(@PathVariable Long id, @Valid @RequestBody PostRequest request) {
        return postService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        postService.delete(id);
    }
}
