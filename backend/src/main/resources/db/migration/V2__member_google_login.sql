-- 비밀번호 로그인 대신 Google 로그인(OIDC)으로 변경. 데이터 없는 상태에서 적용
ALTER TABLE member
    DROP COLUMN username,
    DROP COLUMN password_hash,
    ADD COLUMN google_sub VARCHAR(255) NOT NULL UNIQUE,
    ADD COLUMN email      VARCHAR(320) NOT NULL;
