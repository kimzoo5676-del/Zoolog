package com.zoolog.notification;

import com.zoolog.notification.ReminderProperties.Reminder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

// 소유자에게 알림 메일 한 통. 본문은 제목과 같은 한 줄 (간략하게, 2026-10-13 소유자 요청)
@Component
public class ReminderMailer {

    private static final Logger log = LoggerFactory.getLogger(ReminderMailer.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final String ownerEmail;

    public ReminderMailer(JavaMailSender mailSender, @Value("${spring.mail.username}") String from,
            @Value("${zoolog.owner-email}") String ownerEmail) {
        this.mailSender = mailSender;
        this.from = from;
        this.ownerEmail = ownerEmail;
    }

    public void send(Reminder reminder) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(ownerEmail);
        message.setSubject("[Zoolog] " + reminder.subject());
        message.setText(reminder.subject());
        // 발송 실패가 다음 알림 일정을 멈추지 않도록 기록만 남김
        try {
            mailSender.send(message);
        } catch (MailException e) {
            log.error("알림 메일 발송 실패: {}", reminder.subject(), e);
        }
    }
}
