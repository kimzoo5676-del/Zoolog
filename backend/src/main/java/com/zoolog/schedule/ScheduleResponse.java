package com.zoolog.schedule;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ScheduleResponse(
        Long id,
        String title,
        LocalTime startTime,
        List<DayOfWeek> repeatDays,
        LocalDate startDate,
        LocalDate endDate
) {
    public static ScheduleResponse from(Schedule schedule) {
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getTitle(),
                schedule.getStartTime(),
                schedule.getRepeatDays().stream().sorted().toList(),
                schedule.getStartDate(),
                schedule.getEndDate()
        );
    }
}
