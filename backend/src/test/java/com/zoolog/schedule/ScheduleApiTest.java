package com.zoolog.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ScheduleApiTest {

    // 오늘 = 2026-10-16(금) 한국 시간으로 고정
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 16);

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ScheduleRepository scheduleRepository;

    @Autowired
    ScheduleRecordRepository recordRepository;

    @Autowired
    ScheduleService scheduleService;

    @Autowired
    EntityManager entityManager;

    @MockitoBean
    Clock clock;

    @BeforeEach
    void fixToday() {
        given(clock.getZone()).willReturn(SEOUL);
        given(clock.instant()).willReturn(TODAY.atTime(9, 0).atZone(SEOUL).toInstant());
    }

    @Test
    @DisplayName("로그인하지 않아도 일정 보드를 볼 수 있다")
    void boardIsPublic() throws Exception {
        scheduleRepository.save(new Schedule("AWS-SAA 공부", LocalTime.of(7, 0), EnumSet.allOf(DayOfWeek.class), TODAY.minusDays(10), null));

        mockMvc.perform(get("/api/schedules/board"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.today").value("2026-10-16"))
                // 12주 전 월요일부터: 이번 주 월요일 10-12에서 11주 전
                .andExpect(jsonPath("$.from").value("2026-07-27"));
    }

    @Test
    @DisplayName("로그인하지 않으면 일정을 등록할 수 없다")
    void createRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/schedules").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("일정을 등록하면 시작일을 비워도 오늘부터 시작한다")
    void createDefaultsToToday() throws Exception {
        mockMvc.perform(post("/api/schedules").with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.startDate").value("2026-10-16"))
                .andExpect(jsonPath("$.repeatDays[0]").value("MONDAY"));
    }

    @Test
    @DisplayName("미래 날짜와 일정이 없는 요일은 체크할 수 없다")
    void rejectInvalidDates() throws Exception {
        Schedule schedule = scheduleRepository.save(
                new Schedule("토익", LocalTime.of(18, 0), EnumSet.of(DayOfWeek.FRIDAY), TODAY.minusWeeks(3), null));

        mockMvc.perform(put("/api/schedules/{id}/records/{date}", schedule.getId(), "2026-10-23").with(oidcLogin()).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("아직 오지 않은 날은 체크할 수 없어요"));
        mockMvc.perform(put("/api/schedules/{id}/records/{date}", schedule.getId(), "2026-10-15").with(oidcLogin()).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("그날은 이 일정이 없어요"));
    }

    @Test
    @DisplayName("같은 날 체크를 두 번 보내도 기록은 하나이고, 해제하면 사라진다")
    void markAndUnmark() throws Exception {
        Schedule schedule = scheduleRepository.save(
                new Schedule("AWS", LocalTime.of(7, 0), EnumSet.allOf(DayOfWeek.class), TODAY.minusDays(3), null));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(put("/api/schedules/{id}/records/{date}", schedule.getId(), TODAY).with(oidcLogin()).with(csrf()))
                    .andExpect(status().isNoContent());
        }
        assertThat(recordRepository.findDatesBySchedule(schedule)).containsExactly(TODAY);

        mockMvc.perform(get("/api/schedules/board"))
                .andExpect(jsonPath("$.schedules[?(@.schedule.id == %d)].doneToday".formatted(schedule.getId())).value(true));

        mockMvc.perform(delete("/api/schedules/{id}/records/{date}", schedule.getId(), TODAY).with(oidcLogin()).with(csrf()))
                .andExpect(status().isNoContent());
        assertThat(recordRepository.findDatesBySchedule(schedule)).isEmpty();
    }

    @Test
    @DisplayName("연속 일수는 쉬는 요일을 건너뛰고, 오늘을 아직 안 했으면 어제부터 센다")
    void streakSkipsRestDays() {
        // 월·수·금 일정: 10-05(월) 놓침, 10-07(수)·10-09(금)·10-12(월)·10-14(수) 완료, 오늘 10-16(금)은 아직
        Schedule schedule = scheduleRepository.save(new Schedule(
                "운동", LocalTime.of(6, 0), Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY), LocalDate.of(2026, 10, 1), null));
        for (String date : new String[] {"2026-10-07", "2026-10-09", "2026-10-12", "2026-10-14"}) {
            recordRepository.save(new ScheduleRecord(schedule, LocalDate.parse(date)));
        }

        assertThat(scheduleService.streak(schedule, TODAY)).isEqualTo(4);

        recordRepository.save(new ScheduleRecord(schedule, TODAY));
        assertThat(scheduleService.streak(schedule, TODAY)).isEqualTo(5);
    }

    @Test
    @DisplayName("완료 기록이 있는 일정도 삭제된다")
    void deleteWithRecords() throws Exception {
        Schedule schedule = scheduleRepository.save(
                new Schedule("AWS", LocalTime.of(7, 0), EnumSet.allOf(DayOfWeek.class), TODAY.minusDays(3), null));
        recordRepository.save(new ScheduleRecord(schedule, TODAY));

        mockMvc.perform(delete("/api/schedules/{id}", schedule.getId()).with(oidcLogin()).with(csrf()))
                .andExpect(status().isNoContent());
        assertThat(scheduleRepository.findById(schedule.getId())).isEmpty();
    }

    @Test
    @DisplayName("일정을 수정하면 제목·시각·요일·기간이 바뀌고 완료 기록은 남는다")
    void updateKeepsRecords() throws Exception {
        Schedule schedule = scheduleRepository.save(
                new Schedule("AWS", LocalTime.of(7, 0), EnumSet.allOf(DayOfWeek.class), TODAY.minusDays(3), null));
        recordRepository.save(new ScheduleRecord(schedule, TODAY));

        mockMvc.perform(put("/api/schedules/{id}", schedule.getId()).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "AWS-SAA 공부", "startTime": "06:30", "repeatDays": ["FRIDAY", "MONDAY"],
                                 "startDate": "2026-10-01", "endDate": "2026-12-31"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("AWS-SAA 공부"));

        entityManager.flush();
        entityManager.clear();
        Schedule saved = scheduleRepository.findById(schedule.getId()).orElseThrow();
        assertThat(saved.getStartTime()).isEqualTo(LocalTime.of(6, 30));
        assertThat(saved.getRepeatDays()).containsExactlyInAnyOrder(DayOfWeek.MONDAY, DayOfWeek.FRIDAY);
        assertThat(saved.getStartDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(saved.getEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(recordRepository.findDatesBySchedule(saved)).containsExactly(TODAY);
    }

    @Test
    @DisplayName("끝나는 날을 비워 수정하면 계속 반복하고, 시작일보다 앞서면 수정할 수 없다")
    void updateEndDate() throws Exception {
        Schedule schedule = scheduleRepository.save(new Schedule(
                "토익", LocalTime.of(18, 0), EnumSet.of(DayOfWeek.FRIDAY), TODAY.minusWeeks(3), TODAY.plusWeeks(1)));

        mockMvc.perform(put("/api/schedules/{id}", schedule.getId()).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDate").doesNotExist())
                // 시작일을 비우면 원래 시작일 유지
                .andExpect(jsonPath("$.startDate").value(TODAY.minusWeeks(3).toString()));

        mockMvc.perform(put("/api/schedules/{id}", schedule.getId()).with(oidcLogin()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "토익", "startTime": "18:00", "repeatDays": ["FRIDAY"],
                                 "startDate": "2026-10-16", "endDate": "2026-10-15"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("끝나는 날은 시작하는 날 이후여야 해요"));
    }

    @Test
    @DisplayName("로그인하지 않으면 일정을 수정할 수 없다")
    void updateRequiresLogin() throws Exception {
        Schedule schedule = scheduleRepository.save(
                new Schedule("AWS", LocalTime.of(7, 0), EnumSet.allOf(DayOfWeek.class), TODAY, null));

        mockMvc.perform(put("/api/schedules/{id}", schedule.getId()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isUnauthorized());
    }

    private static String body() {
        return """
                {"title": "AWS-SAA 공부", "startTime": "07:00", "repeatDays": ["FRIDAY", "MONDAY"]}
                """;
    }
}
