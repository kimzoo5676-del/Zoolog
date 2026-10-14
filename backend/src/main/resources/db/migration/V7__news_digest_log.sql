-- 아침 기사 메일을 보낸 날 기록 (2026-10-14): 서버가 꺼져 있었거나 발송에 실패한 날은 그날 안에 다시 보내고, 이미 보낸 날은 다시 보내지 않음
CREATE TABLE news_digest_log (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sent_on    DATE        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
