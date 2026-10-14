package com.zoolog.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

// 소유자에게 보내는 메일 (알림, 아침 기사). 제목 앞에 [Zoolog]
@Component
public class OwnerMailer {

    private static final Logger log = LoggerFactory.getLogger(OwnerMailer.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final String ownerEmail;

    public OwnerMailer(JavaMailSender mailSender, @Value("${spring.mail.username}") String from,
            @Value("${zoolog.owner-email}") String ownerEmail) {
        this.mailSender = mailSender;
        this.from = from;
        this.ownerEmail = ownerEmail;
    }

    // 보냈으면 true. 실패는 기록만 남기고 false (아침 기사 메일은 false면 나중에 다시 시도)
    public boolean send(String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(ownerEmail);
        message.setSubject("[Zoolog] " + subject);
        message.setText(text);
        // 발송 실패가 다음 예약 작업을 멈추지 않도록 예외를 던지지 않음
        try {
            mailSender.send(message);
            return true;
        } catch (MailException e) {
            log.error("메일 발송 실패: {}", subject, e);
            return false;
        }
    }
}
