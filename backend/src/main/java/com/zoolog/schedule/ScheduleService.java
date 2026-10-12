package com.zoolog.schedule;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ScheduleService {

    static final int MAX_WEEKS = 53;

    private final ScheduleRepository scheduleRepository;
    private final ScheduleRecordRepository recordRepository;
    private final Clock clock;

    public ScheduleService(ScheduleRepository scheduleRepository, ScheduleRecordRepository recordRepository, Clock clock) {
        this.scheduleRepository = scheduleRepository;
        this.recordRepository = recordRepository;
        this.clock = clock;
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    // 보드 기간: 이번 주 월요일에서 (weeks - 1)주 전 월요일부터 오늘까지 (잔디 격자의 열 = 주)
    public BoardResponse board(int weeks) {
        LocalDate today = today();
        int span = Math.clamp(weeks, 1, MAX_WEEKS);
        LocalDate from = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(span - 1L);

        Map<Long, Set<LocalDate>> doneBySchedule = recordRepository.findAllBetween(from, today).stream()
                .collect(Collectors.groupingBy(
                        (record) -> record.getSchedule().getId(),
                        Collectors.mapping(ScheduleRecord::getRecordDate, Collectors.toSet())));

        List<BoardResponse.Item> items = scheduleRepository.findAll().stream()
                .sorted(Comparator.comparing(Schedule::getStartTime).thenComparing(Schedule::getId))
                .map((schedule) -> {
                    Set<LocalDate> done = doneBySchedule.getOrDefault(schedule.getId(), Set.of());
                    return new BoardResponse.Item(
                            ScheduleResponse.from(schedule),
                            schedule.isDueOn(today),
                            done.contains(today),
                            streak(schedule, today),
                            done.stream().sorted().toList());
                })
                .toList();
        return new BoardResponse(today, from, items);
    }

    // 연속 일수: 해야 했던 날만 세고(쉬는 요일은 건너뜀), 오늘을 아직 안 했으면 어제부터 셈
    int streak(Schedule schedule, LocalDate today) {
        Set<LocalDate> done = new HashSet<>(recordRepository.findDatesBySchedule(schedule));
        LocalDate day = done.contains(today) ? today : today.minusDays(1);
        int count = 0;
        for (; !day.isBefore(schedule.getStartDate()); day = day.minusDays(1)) {
            if (!schedule.isDueOn(day)) {
                continue;
            }
            if (!done.contains(day)) {
                break;
            }
            count++;
        }
        return count;
    }

    @Transactional
    public ScheduleResponse create(ScheduleRequest request) {
        LocalDate startDate = request.startDate() != null ? request.startDate() : today();
        validatePeriod(startDate, request.endDate());
        Schedule schedule = new Schedule(request.title(), request.startTime(), request.repeatDays(), startDate, request.endDate());
        return ScheduleResponse.from(scheduleRepository.save(schedule));
    }

    @Transactional
    public ScheduleResponse update(Long id, ScheduleRequest request) {
        Schedule schedule = getSchedule(id);
        LocalDate startDate = request.startDate() != null ? request.startDate() : schedule.getStartDate();
        validatePeriod(startDate, request.endDate());
        schedule.update(request.title(), request.startTime(), request.repeatDays(), startDate, request.endDate());
        return ScheduleResponse.from(schedule);
    }

    // 완료 기록이 일정을 참조(FK)하므로 기록부터 삭제
    @Transactional
    public void delete(Long id) {
        Schedule schedule = getSchedule(id);
        recordRepository.deleteAllBySchedule(schedule);
        scheduleRepository.delete(schedule);
    }

    // 완료 체크 (이미 있으면 그대로, 같은 요청을 여러 번 보내도 결과가 같음)
    @Transactional
    public void markDone(Long id, LocalDate date) {
        Schedule schedule = getSchedule(id);
        if (date.isAfter(today())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아직 오지 않은 날은 체크할 수 없어요");
        }
        if (!schedule.isDueOn(date)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "그날은 이 일정이 없어요");
        }
        if (recordRepository.findByScheduleAndRecordDate(schedule, date).isEmpty()) {
            recordRepository.save(new ScheduleRecord(schedule, date));
        }
    }

    @Transactional
    public void unmarkDone(Long id, LocalDate date) {
        Schedule schedule = getSchedule(id);
        recordRepository.findByScheduleAndRecordDate(schedule, date).ifPresent(recordRepository::delete);
    }

    private Schedule getSchedule(Long id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없어요"));
    }

    private static void validatePeriod(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "끝나는 날은 시작하는 날 이후여야 해요");
        }
    }
}
