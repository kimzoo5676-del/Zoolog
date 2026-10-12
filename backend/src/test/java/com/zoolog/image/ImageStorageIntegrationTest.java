package com.zoolog.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import software.amazon.awssdk.services.s3.S3Client;

// 실제 저장소(개발용 SeaweedFS)에 쓰고 읽기. 테스트 파일은 끝나면 지움
@SpringBootTest
class ImageStorageIntegrationTest {

    @Autowired
    ImageStorage storage;

    @Autowired
    S3Client s3Client;

    @Value("${zoolog.storage.bucket}")
    String bucket;

    @Test
    @DisplayName("저장소에 올린 파일을 같은 내용과 형식으로 다시 읽을 수 있다")
    void putAndGet() throws Exception {
        String key = "test/" + UUID.randomUUID() + ".png";
        byte[] bytes = {(byte) 0x89, 'P', 'N', 'G', 1, 2, 3};
        try {
            storage.put(key, "image/png", bytes);
            try (var object = storage.get(key)) {
                assertThat(object.readAllBytes()).isEqualTo(bytes);
                assertThat(object.response().contentType()).isEqualTo("image/png");
            }
        } finally {
            s3Client.deleteObject((request) -> request.bucket(bucket).key(key));
        }
    }
}
