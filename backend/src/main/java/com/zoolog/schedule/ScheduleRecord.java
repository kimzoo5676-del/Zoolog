package com.zoolog.schedule;

import com.zoolog.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.LocalDate;

// 하루 완료 기록. 완료(DONE)만 저장하고, 해야 했지만 기록 없는 날은 보드에서 "놓침"으로 계산
// (스키마의 MISSED 값은 쓰지 않음)
@Entity
public class ScheduleRecord extends BaseTimeEntity {

    static final String DONE = "DONE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(nullable = false)
    private LocalDate recordDate;

    @Column(nullable = false, length = 10)
    private String status;

    protected ScheduleRecord() {
    }

    public ScheduleRecord(Schedule schedule, LocalDate recordDate) {
        this.schedule = schedule;
        this.recordDate = recordDate;
        this.status = DONE;
    }

    public Long getId() {
        return id;
    }

    public Schedule getSchedule() {
        return schedule;
    }

    public LocalDate getRecordDate() {
        return recordDate;
    }
}
