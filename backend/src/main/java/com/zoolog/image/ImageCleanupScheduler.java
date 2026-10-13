package com.zoolog.image;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// 매일 04:00(한국 시각) 연결 없는 이미지 정리. 03:00 pg_dump 백업 뒤에 실행
// backend는 파드 1개(Recreate)라 같은 작업이 동시에 두 번 돌지 않음
@Component
public class ImageCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(ImageCleanupScheduler.class);

    private final ImageService imageService;

    public ImageCleanupScheduler(ImageService imageService) {
        this.imageService = imageService;
    }

    @Scheduled(cron = "0 0 4 * * *", zone = "${zoolog.zone}")
    void deleteUnusedImages() {
        int deleted = imageService.deleteUnusedImages();
        if (deleted > 0) {
            log.info("연결 없는 이미지 {}개 삭제", deleted);
        }
    }
}
