package com.zoolog.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// @Scheduled 작업 활성화 (연결 없는 이미지 정리)
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
