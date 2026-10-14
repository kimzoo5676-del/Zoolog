package com.zoolog.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// 예약 작업 활성화: 연결 없는 이미지 정리, 아침 기사 메일(@Scheduled), 알림 메일(SchedulingConfigurer)
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
