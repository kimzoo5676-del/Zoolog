package com.zoolog.schedule;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ScheduleRecordRepository extends JpaRepository<ScheduleRecord, Long> {

    Optional<ScheduleRecord> findByScheduleAndRecordDate(Schedule schedule, LocalDate recordDate);

    // 보드: 기간 안 모든 일정의 완료 기록을 한 번에 (일정마다 따로 조회하지 않도록, N+1 방지)
    @Query("select r from ScheduleRecord r join fetch r.schedule where r.recordDate between :from and :to")
    List<ScheduleRecord> findAllBetween(LocalDate from, LocalDate to);

    // 연속 일수 계산용: 한 일정의 완료 날짜 전체 (최신순)
    @Query("select r.recordDate from ScheduleRecord r where r.schedule = :schedule order by r.recordDate desc")
    List<LocalDate> findDatesBySchedule(Schedule schedule);

    @Modifying
    @Query("delete from ScheduleRecord r where r.schedule = :schedule")
    void deleteAllBySchedule(Schedule schedule);
}
