package com.zoolog.news;

import com.zoolog.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;

// 아침 기사 메일을 보낸 날 (한국 날짜). 하루 한 번만 보내고, 못 보낸 날은 다시 시도하는 기준
@Entity
public class NewsDigestLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate sentOn;

    protected NewsDigestLog() {
    }

    public NewsDigestLog(LocalDate sentOn) {
        this.sentOn = sentOn;
    }

    public LocalDate getSentOn() {
        return sentOn;
    }
}
