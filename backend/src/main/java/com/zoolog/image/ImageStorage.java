package com.zoolog.image;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;

// 저장소 읽기·쓰기 (S3 API). 버킷이 없으면 서버 시작 시 만듦
@Component
public class ImageStorage {

    private final S3Client s3Client;
    private final String bucket;

    public ImageStorage(S3Client s3Client, @Value("${zoolog.storage.bucket}") String bucket) {
        this.s3Client = s3Client;
        this.bucket = bucket;
    }

    @EventListener(ApplicationReadyEvent.class)
    void ensureBucket() {
        try {
            s3Client.headBucket((request) -> request.bucket(bucket));
        } catch (NoSuchBucketException e) {
            s3Client.createBucket((request) -> request.bucket(bucket));
        }
    }

    public void put(String key, String contentType, byte[] bytes) {
        s3Client.putObject((request) -> request.bucket(bucket).key(key).contentType(contentType), RequestBody.fromBytes(bytes));
    }

    public ResponseInputStream<GetObjectResponse> get(String key) {
        return s3Client.getObject((request) -> request.bucket(bucket).key(key));
    }
}
