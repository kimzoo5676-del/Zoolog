package com.zoolog.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

// 일정 등록·수정 공용. startDate를 비우면 오늘부터, endDate를 비우면 계속
public record ScheduleRequest(
        @NotBlank @Size(max = 100) String title,
        @NotNull LocalTime startTime,
        @NotEmpty Set<DayOfWeek> repeatDays,
        LocalDate startDate,
        LocalDate endDate
) {
}
