package com.zoolog.clip;

import com.zoolog.post.PostDetailResponse;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 소유자 전용(로그인 + CSRF 헤더): SecurityConfig의 anyRequest().authenticated()
@RestController
@RequestMapping("/api/clips")
public class ClipController {

    private final ClipService clipService;

    public ClipController(ClipService clipService) {
        this.clipService = clipService;
    }

    // 이미 스크랩한 기사면 200 + 글 번호, 아니면 204
    @GetMapping
    public ResponseEntity<ClipLookupResponse> find(@RequestParam String url) {
        return clipService.findByUrl(url).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    // 201 Created + Location(새 글 주소)
    @PostMapping
    public ResponseEntity<PostDetailResponse> create(@Valid @RequestBody ClipRequest request) {
        PostDetailResponse created = clipService.create(request);
        return ResponseEntity.created(URI.create("/api/posts/" + created.id())).body(created);
    }
}
