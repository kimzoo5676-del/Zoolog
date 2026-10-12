package com.zoolog.image;

import java.time.Duration;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// 이미지는 저장소(SeaweedFS)를 외부에 공개하지 않고 이 백엔드를 거쳐 올리고 내려줌 (CLAUDE.md 보안 규칙)
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    // 소유자 전용 (SecurityConfig: GET 외 요청은 로그인 + CSRF)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageResponse upload(@RequestParam("file") MultipartFile file) {
        return imageService.upload(file);
    }

    // 공개: 파일 이름이 UUID라 내용이 바뀌지 않으므로 1년 캐시 + immutable
    @GetMapping("/{fileName:[0-9a-f-]{36}\\.(?:jpg|png|gif|webp)}")
    public ResponseEntity<InputStreamResource> get(@PathVariable String fileName) {
        StoredImage image = imageService.load(fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(new InputStreamResource(image.body()));
    }
}
