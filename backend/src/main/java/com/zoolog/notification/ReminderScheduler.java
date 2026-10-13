package com.zoolog.notification;

import java.util.TimeZone;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

// 설정 파일의 알림 목록을 cron 작업으로 등록 (목록 길이가 정해져 있지 않아 @Scheduled 대신 직접 등록)
@Configuration
@EnableConfigurationProperties(ReminderProperties.class)
public class ReminderScheduler implements SchedulingConfigurer {

    private final ReminderProperties properties;
    private final ReminderMailer mailer;
    private final TimeZone zone;

    public ReminderScheduler(ReminderProperties properties, ReminderMailer mailer, @Value("${zoolog.zone}") String zone) {
        this.properties = properties;
        this.mailer = mailer;
        this.zone = TimeZone.getTimeZone(zone);
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        if (!properties.enabled()) {
            return;
        }
        for (ReminderProperties.Reminder reminder : properties.items()) {
            registrar.addCronTask(new CronTask(() -> mailer.send(reminder), new CronTrigger(reminder.cron(), zone)));
        }
    }
}
