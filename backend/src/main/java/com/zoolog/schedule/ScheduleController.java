package com.zoolog.schedule;

import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    // 공개: 방문자도 보드를 봄 (2026-10-12 결정)
    @GetMapping("/board")
    public BoardResponse board(@RequestParam(defaultValue = "12") int weeks) {
        return scheduleService.board(weeks);
    }

    // 이하 소유자 전용 (SecurityConfig: GET 외 요청은 로그인 + CSRF)
    @PostMapping
    public ResponseEntity<ScheduleResponse> create(@Valid @RequestBody ScheduleRequest request) {
        ScheduleResponse created = scheduleService.create(request);
        return ResponseEntity.created(URI.create("/api/schedules/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public ScheduleResponse update(@PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
        return scheduleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        scheduleService.delete(id);
    }

    // 완료 체크·해제: 날짜 하나가 자원 하나 (PUT/DELETE, 여러 번 보내도 같은 결과)
    @PutMapping("/{id}/records/{date}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markDone(@PathVariable Long id, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        scheduleService.markDone(id, date);
    }

    @DeleteMapping("/{id}/records/{date}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unmarkDone(@PathVariable Long id, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        scheduleService.unmarkDone(id, date);
    }
}
