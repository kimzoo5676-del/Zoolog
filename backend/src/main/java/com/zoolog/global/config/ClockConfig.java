package com.zoolog.global.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// "오늘"의 기준 시계: 일정·완료 기록은 한국 날짜 기준. 테스트에서 고정 시계로 바꿔 날짜를 재현
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock(@Value("${zoolog.zone}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
