package com.zoolog.news;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NewsDigestSchedulerTest {

    private static final String CRON = "0 0 6-23 * * *";
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 14);

    private final NewsDigestService digestService = mock(NewsDigestService.class);
    private final NewsDigestLogRepository logRepository = mock(NewsDigestLogRepository.class);

    @Test
    @DisplayName("06:00 전에 서버가 시작되면 보내지 않는다")
    void notBeforeFirstRun() {
        schedulerAt("2026-10-14T05:30:00+09:00").sendIfDue();

        verify(digestService, never()).sendDailyDigest();
    }

    @Test
    @DisplayName("06:00이 지났는데 오늘 보낸 기록이 없으면 보내고 기록한다")
    void sendMissedDigest() {
        given(digestService.sendDailyDigest()).willReturn(true);

        schedulerAt("2026-10-14T10:20:00+09:00").sendIfDue();

        verify(digestService).sendDailyDigest();
        verify(logRepository).save(any(NewsDigestLog.class));
    }

    @Test
    @DisplayName("오늘 이미 보냈으면 다시 보내지 않는다")
    void skipAlreadySent() {
        given(logRepository.existsBySentOn(TODAY)).willReturn(true);

        schedulerAt("2026-10-14T11:00:00+09:00").sendIfDue();

        verify(digestService, never()).sendDailyDigest();
    }

    @Test
    @DisplayName("발송에 실패하면 기록하지 않아 다음 정각에 다시 시도한다")
    void retryAfterFailure() {
        given(digestService.sendDailyDigest()).willReturn(false);

        schedulerAt("2026-10-14T06:00:00+09:00").sendIfDue();

        verify(logRepository, never()).save(any());
    }

    private NewsDigestScheduler schedulerAt(String time) {
        Clock clock = Clock.fixed(OffsetDateTime.parse(time).toInstant(), ZoneId.of("Asia/Seoul"));
        return new NewsDigestScheduler(digestService, logRepository, clock, CRON);
    }
}
