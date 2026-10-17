-- 글을 실제로 쓴 시각 (2026-10-16 소유자 요청): Streak·글 날짜·최신순 정렬의 기준
-- 목차용으로 미리 만든 '작성 예정' 글은 아직 쓰지 않은 글이라 NULL(시각 컬럼 NOT NULL 규칙의 의도된 예외),
-- 처음 내용을 채워 저장한 순간 그 시각이 들어감 (Post.publishIfWritten)
ALTER TABLE post ADD COLUMN published_at TIMESTAMPTZ;

UPDATE post SET published_at = created_at WHERE btrim(content) <> '작성 예정';

-- 2026-10-12 AWS-SAA 목차로 미리 만든 글 중 이미 내용을 채운 글(예: IAM, 16일 작성)은 채운 날(마지막 수정 시각)로
WITH RECURSIVE saa AS (
    SELECT id FROM category WHERE slug = 'aws-saa'
    UNION ALL
    SELECT c.id FROM category c JOIN saa ON c.parent_id = saa.id
)
UPDATE post SET published_at = updated_at
WHERE category_id IN (SELECT id FROM saa)
  AND (created_at AT TIME ZONE 'Asia/Seoul')::date = DATE '2026-10-12'
  AND btrim(content) <> '작성 예정'
  AND updated_at > created_at + INTERVAL '1 day';

CREATE INDEX idx_post_published_at ON post (published_at);
