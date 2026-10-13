package com.zoolog.notification;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

// 운영처럼 알림을 켜면 설정의 알림마다 cron 작업이 등록되는지
@SpringBootTest(properties = "zoolog.reminders.enabled=true")
class ReminderSchedulerTest {

    @Autowired
    ScheduledTaskHolder taskHolder;

    @MockitoBean
    JavaMailSender mailSender;

    @Test
    @DisplayName("알림을 켜면 설정한 시각마다 한국 시간 기준 cron 작업이 등록된다")
    void registersCronTasks() {
        assertThat(taskHolder.getScheduledTasks())
                .map((task) -> task.getTask())
                .filteredOn(CronTask.class::isInstance)
                .map((task) -> ((CronTask) task).getExpression())
                .contains("0 0 7 * * *", "0 0 18 * * *");
    }
}
