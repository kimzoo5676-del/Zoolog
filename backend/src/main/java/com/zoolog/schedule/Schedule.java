package com.zoolog.schedule;

import com.zoolog.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;

// 반복 일정 (예: 매일 07:00 AWS-SAA 공부). 기간은 시작일부터 종료일(없으면 계속)까지
@Entity
public class Schedule extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false)
    private LocalTime startTime;

    @Convert(converter = RepeatDaysConverter.class)
    @Column(name = "repeat_days", length = 30)
    private Set<DayOfWeek> repeatDays;

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    protected Schedule() {
    }

    public Schedule(String title, LocalTime startTime, Set<DayOfWeek> repeatDays, LocalDate startDate, LocalDate endDate) {
        this.title = title;
        this.startTime = startTime;
        this.repeatDays = EnumSet.copyOf(repeatDays);
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public void update(String title, LocalTime startTime, Set<DayOfWeek> repeatDays, LocalDate startDate, LocalDate endDate) {
        this.title = title;
        this.startTime = startTime;
        this.repeatDays = EnumSet.copyOf(repeatDays);
        this.startDate = startDate;
        this.endDate = endDate;
    }

    // 그날 해야 하는 일정인지: 기간 안 + 반복 요일
    public boolean isDueOn(LocalDate date) {
        return !date.isBefore(startDate)
                && (endDate == null || !date.isAfter(endDate))
                && repeatDays.contains(date.getDayOfWeek());
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public Set<DayOfWeek> getRepeatDays() {
        return repeatDays;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }
}
