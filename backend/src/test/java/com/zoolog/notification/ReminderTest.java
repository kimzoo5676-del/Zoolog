package com.zoolog.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;

import com.zoolog.notification.ReminderProperties.Reminder;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class ReminderTest {

    @Autowired
    ReminderProperties properties;

    @Autowired
    OwnerMailer mailer;

    // 실제 Gmail로 보내지 않도록 가짜로 대체
    @MockitoBean
    JavaMailSender mailSender;

    @Test
    @DisplayName("기본 설정은 매일 07시 AWS-SAA, 18시 영어 공부 알림이고 개발·테스트에서는 꺼져 있다")
    void defaultReminders() {
        assertThat(properties.enabled()).isFalse();
        assertThat(properties.items()).extracting(Reminder::subject)
                .containsExactly("AWS-SAA 공부 시간입니다", "영어 공부 시간입니다");

        ZonedDateTime midnight = ZonedDateTime.of(2026, 10, 14, 0, 0, 0, 0, ZoneId.of("Asia/Seoul"));
        assertThat(CronExpression.parse(properties.items().get(0).cron()).next(midnight).getHour()).isEqualTo(7);
        assertThat(CronExpression.parse(properties.items().get(1).cron()).next(midnight).getHour()).isEqualTo(18);
    }

    @Test
    @DisplayName("알림 메일은 소유자에게 제목 앞에 [Zoolog]를 붙여 보낸다")
    void sendToOwner() {
        mailer.send("AWS-SAA 공부 시간입니다", "AWS-SAA 공부 시간입니다");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getTo()).containsExactly("owner@example.com");
        assertThat(captor.getValue().getSubject()).isEqualTo("[Zoolog] AWS-SAA 공부 시간입니다");
        assertThat(captor.getValue().getText()).isEqualTo("AWS-SAA 공부 시간입니다");
    }

    @Test
    @DisplayName("발송에 실패해도 예외를 던지지 않아 다음 알림이 계속 동작한다")
    void failureDoesNotThrow() {
        willThrow(new MailSendException("연결 실패")).given(mailSender).send(any(SimpleMailMessage.class));

        mailer.send("영어 공부 시간입니다", "영어 공부 시간입니다");
    }
}
