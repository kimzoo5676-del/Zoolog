package com.zoolog.image;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

// SeaweedFS(S3 호환) 연결. 접근 키는 환경 변수 AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (.devcontainer/.env)
@Configuration
public class StorageConfig {

    @Bean
    public S3Client s3Client(@Value("${zoolog.storage.endpoint}") String endpoint) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                // SeaweedFS는 리전 개념이 없지만 SDK가 요구하므로 고정값
                .region(Region.US_EAST_1)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                // 버킷을 주소 경로로 지정 (http://storage:8333/zoolog/...), 가상 호스트 방식(zoolog.storage:8333)은 내부 DNS에 없음
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }
}
