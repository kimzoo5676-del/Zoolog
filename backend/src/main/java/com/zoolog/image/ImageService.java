package com.zoolog.image;

import com.zoolog.post.Post;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ImageService {

    static final String URL_PREFIX = "/api/images/";
    private static final String KEY_PREFIX = "images/";
    // 연결 없는 이미지를 남겨 두는 기간 (2026-10-13 소유자 결정 1일): 작성 중이거나 방금 본문에서 뺀 이미지는 남김
    static final Duration UNUSED_GRACE = Duration.ofDays(1);
    // 올린 이미지 파일 이름 (UUID.확장자): 컨트롤러 주소 패턴과 본문 검색에 함께 사용
    static final String FILE_NAME = "[0-9a-f-]{36}\\.(?:jpg|png|gif|webp)";
    // 본문 마크다운에서 이 사이트에 올린 이미지 주소 찾기
    private static final Pattern IMAGE_URL = Pattern.compile(URL_PREFIX + "(" + FILE_NAME + ")");

    private final ImageStorage storage;
    private final PostImageRepository postImageRepository;
    private final Clock clock;

    public ImageService(ImageStorage storage, PostImageRepository postImageRepository, Clock clock) {
        this.storage = storage;
        this.postImageRepository = postImageRepository;
        this.clock = clock;
    }

    // 원본 그대로 저장 (2026-10-12 결정: 가공 없음, 크기 제한은 spring.servlet.multipart 10MB)
    // 파일 이름은 UUID라 추측 불가·충돌 없음, 같은 주소의 내용이 바뀌지 않으므로 오래 캐시 가능
    @Transactional
    public ImageResponse upload(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일을 읽지 못했어요");
        }
        ImageType type = ImageType.detect(bytes)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE, "JPEG, PNG, GIF, WebP 이미지만 올릴 수 있어요"));
        String fileName = UUID.randomUUID() + "." + type.extension;
        String key = KEY_PREFIX + fileName;
        postImageRepository.save(new PostImage(key, type.contentType, clock.instant()));
        // 저장소 업로드는 DB 트랜잭션 밖이라 롤백되지 않음: 기록 저장(커밋)이 실패하면 올린 파일을 지워 기록 없는 파일이 남지 않게 함
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    storage.delete(key);
                }
            }
        });
        storage.put(key, type.contentType, bytes);
        return new ImageResponse(URL_PREFIX + fileName);
    }

    // 글 저장 후 호출: 본문에 쓰인 이미지는 이 글과 연결, 이 글에 연결돼 있었지만 본문에서 빠진 이미지는 이 글과의 연결만 해제
    // 다른 글에도 쓰인 이미지는 그 글과의 연결이 남음 (한 이미지를 여러 글이 함께 사용)
    @Transactional
    public void syncImages(Post post) {
        Set<String> keys = new HashSet<>();
        Matcher matcher = IMAGE_URL.matcher(post.getContent());
        while (matcher.find()) {
            keys.add(KEY_PREFIX + matcher.group(1));
        }
        Instant now = clock.instant();
        for (PostImage image : postImageRepository.findAllLinkedTo(post)) {
            if (!keys.contains(image.getObjectKey())) {
                image.unlinkFrom(post, now);
            }
        }
        if (!keys.isEmpty()) {
            postImageRepository.findAllByObjectKeyIn(keys).forEach((image) -> image.linkTo(post));
        }
    }

    // 글 삭제 전 호출: 연결 테이블이 글을 참조(FK)하므로 먼저 연결 해제
    @Transactional
    public void unlinkAll(Post post) {
        Instant now = clock.instant();
        postImageRepository.findAllLinkedTo(post).forEach((image) -> image.unlinkFrom(post, now));
    }

    // 연결된 글 없이 UNUSED_GRACE 동안 남은 이미지를 저장소 파일과 기록 모두 삭제 (unusedSince: 마지막 연결이 끊긴 시각)
    // 파일을 먼저 지우고 기록을 지움: 도중에 실패하면 기록이 남아 다음 실행 때 다시 시도
    @Transactional
    public int deleteUnusedImages() {
        Instant cutoff = clock.instant().minus(UNUSED_GRACE);
        List<PostImage> images = postImageRepository.findAllByUnusedSinceBefore(cutoff);
        for (PostImage image : images) {
            storage.delete(image.getObjectKey());
            postImageRepository.delete(image);
        }
        return images.size();
    }

    public StoredImage load(String fileName) {
        PostImage image = postImageRepository.findByObjectKey(KEY_PREFIX + fileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "이미지를 찾을 수 없어요"));
        return new StoredImage(image.getContentType(), storage.get(image.getObjectKey()));
    }
}
