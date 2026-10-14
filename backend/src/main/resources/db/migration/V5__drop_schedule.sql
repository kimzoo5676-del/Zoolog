-- 일정 기능 삭제 (2026-10-14 소유자 결정): 화면은 Streak로 대체, 알림은 설정 파일의 고정 목록 메일(zoolog.reminders)
-- 일정 기록이 일정을 참조(FK)하므로 기록 먼저 삭제. 삭제 전 데이터는 매일 03:00 pg_dump 백업에 남아 있음
DROP TABLE schedule_record;
DROP TABLE schedule;
