package com.zoolog.news;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

// 아침 기사 메일: 06:00(한국 시각)에 보내고, 그날 못 보냈으면(서버 꺼짐·배포·발송 실패) 서버 시작 시와 매시 정각에 다시 시도
// 보낸 날은 news_digest_log에 기록해 하루 한 번만. 지난 날짜는 다시 보내지 않음(지난 아침 기사는 의미가 적음)
// 운영(prod)에서만 켬 (개발 서버와 중복 발송 방지)
@Component
@ConditionalOnProperty(prefix = "zoolog.news", name = "enabled", havingValue = "true")
public class NewsDigestScheduler {

    private final NewsDigestService digestService;
    private final NewsDigestLogRepository logRepository;
    private final Clock clock;
    // 첫 실행 시각(06:00) 계산용: zoolog.news.cron의 그날 첫 시각 전에는 보내지 않음
    private final CronExpression cron;

    public NewsDigestScheduler(NewsDigestService digestService, NewsDigestLogRepository logRepository, Clock clock,
            @Value("${zoolog.news.cron}") String cron) {
        this.digestService = digestService;
        this.logRepository = logRepository;
        this.clock = clock;
        this.cron = CronExpression.parse(cron);
    }

    @Scheduled(cron = "${zoolog.news.cron}", zone = "${zoolog.zone}")
    void onSchedule() {
        sendIfDue();
    }

    @EventListener(ApplicationReadyEvent.class)
    void onStartup() {
        sendIfDue();
    }

    // 시작 시 확인과 정각 실행이 겹쳐도 한 번만 보내도록 synchronized (파드 1개 기준)
    synchronized void sendIfDue() {
        ZonedDateTime now = ZonedDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        ZonedDateTime firstRun = cron.next(today.atStartOfDay(now.getZone()).minusNanos(1));
        if (firstRun == null || !firstRun.toLocalDate().equals(today) || now.isBefore(firstRun)) {
            return;
        }
        if (logRepository.existsBySentOn(today)) {
            return;
        }
        if (digestService.sendDailyDigest()) {
            logRepository.save(new NewsDigestLog(today));
        }
    }
}
