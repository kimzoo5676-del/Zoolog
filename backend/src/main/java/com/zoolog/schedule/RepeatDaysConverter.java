package com.zoolog.schedule;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.DayOfWeek;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

// 반복 요일 ↔ DB 문자열 (예: {MONDAY, FRIDAY} ↔ "MON,FRI"), 매일이면 7개 모두
@Converter
public class RepeatDaysConverter implements AttributeConverter<Set<DayOfWeek>, String> {

    @Override
    public String convertToDatabaseColumn(Set<DayOfWeek> days) {
        return days.stream().sorted().map((day) -> day.name().substring(0, 3)).collect(Collectors.joining(","));
    }

    @Override
    public Set<DayOfWeek> convertToEntityAttribute(String value) {
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        if (value == null || value.isBlank()) {
            return EnumSet.allOf(DayOfWeek.class);
        }
        for (String code : value.split(",")) {
            Arrays.stream(DayOfWeek.values())
                    .filter((day) -> day.name().startsWith(code.strip()))
                    .findFirst()
                    .ifPresent(days::add);
        }
        return days;
    }
}
