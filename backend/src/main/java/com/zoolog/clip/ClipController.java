package com.zoolog.clip;

import com.zoolog.post.PostDetailResponse;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 소유자 전용(로그인 + CSRF 헤더): SecurityConfig의 anyRequest().authenticated()
@RestController
@RequestMapping("/api/clips")
public class ClipController {

    private final ClipService clipService;

    public ClipController(ClipService clipService) {
        this.clipService = clipService;
    }

    // 201 Created + Location(새 글 주소)
    @PostMapping
    public ResponseEntity<PostDetailResponse> create(@Valid @RequestBody ClipRequest request) {
        PostDetailResponse created = clipService.create(request);
        return ResponseEntity.created(URI.create("/api/posts/" + created.id())).body(created);
    }
}
