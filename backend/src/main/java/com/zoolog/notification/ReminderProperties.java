package com.zoolog.notification;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

// application.yaml zoolog.reminders: 매일 알림 목록 (cron은 초 분 시 일 월 요일)
@ConfigurationProperties("zoolog.reminders")
public record ReminderProperties(boolean enabled, List<Reminder> items) {

    public ReminderProperties {
        items = items == null ? List.of() : List.copyOf(items);
    }

    public record Reminder(String cron, String subject) {
    }
}
