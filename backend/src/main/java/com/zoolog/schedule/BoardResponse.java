package com.zoolog.schedule;

import java.time.LocalDate;
import java.util.List;

// 일정 보드: 오늘 날짜, 보드 시작일(월요일), 일정별 기록
public record BoardResponse(LocalDate today, LocalDate from, List<Item> schedules) {

    // dueToday: 오늘 해야 하는 일정, streak: 해야 했던 날을 빠짐없이 완료한 연속 일수, doneDates: 기간 안 완료 날짜
    public record Item(
            ScheduleResponse schedule,
            boolean dueToday,
            boolean doneToday,
            int streak,
            List<LocalDate> doneDates
    ) {
    }
}
