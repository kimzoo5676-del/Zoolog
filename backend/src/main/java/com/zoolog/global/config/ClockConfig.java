package com.zoolog.global.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// 지금 시각의 기준 시계 (zoolog.zone, 한국 시간): 이미지 정리 기준 시각, 기사 메일 날짜·24시간 범위·재발송 판단, 글을 쓴 시각(published_at). 테스트에서 고정 시계로 바꿔 재현
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock(@Value("${zoolog.zone}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
