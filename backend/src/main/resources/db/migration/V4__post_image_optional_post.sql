-- 이미지는 글을 저장하기 전(작성 중)에 먼저 올라가므로 처음에는 글과 연결되지 않음
-- 글을 저장할 때 본문에 쓰인 이미지를 그 글과 연결, 본문에서 빠지면 연결 해제(정리 대상)
ALTER TABLE post_image ALTER COLUMN post_id DROP NOT NULL;
ALTER TABLE post_image ADD COLUMN content_type VARCHAR(50) NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE post_image ALTER COLUMN content_type DROP DEFAULT;
