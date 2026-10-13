package com.zoolog.news;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// 매일 06:00(한국 시각) 아침 기사 메일. 운영(prod)에서만 켬 (개발 서버와 중복 발송 방지)
@Component
@ConditionalOnProperty(prefix = "zoolog.news", name = "enabled", havingValue = "true")
public class NewsDigestScheduler {

    private final NewsDigestService digestService;

    public NewsDigestScheduler(NewsDigestService digestService) {
        this.digestService = digestService;
    }

    @Scheduled(cron = "${zoolog.news.cron}", zone = "${zoolog.zone}")
    void sendDailyDigest() {
        digestService.sendDailyDigest();
    }
}
