-- 한 이미지를 여러 글이 함께 쓸 수 있도록 글-이미지 연결을 별도 테이블로 (2026-10-14 소유자 결정)
-- 이전에는 post_image.post_id 하나라 다른 글에 같은 주소를 붙이면 연결이 옮겨 가고, 그 글에서 빼면 원래 글의 이미지까지 삭제 대상이 됨
CREATE TABLE post_image_link (
    post_id       BIGINT NOT NULL REFERENCES post (id),
    post_image_id BIGINT NOT NULL REFERENCES post_image (id),
    PRIMARY KEY (post_id, post_image_id)
);
-- post_id 쪽은 기본 키의 첫 열이라 별도 인덱스 불필요
CREATE INDEX idx_post_image_link_post_image_id ON post_image_link (post_image_id);

INSERT INTO post_image_link (post_id, post_image_id)
SELECT post_id, id FROM post_image WHERE post_id IS NOT NULL;

-- 기존 글 본문에 쓰였지만 연결이 옮겨 가 끊긴 이미지도 다시 연결
INSERT INTO post_image_link (post_id, post_image_id)
SELECT DISTINCT p.id, i.id
FROM post p
CROSS JOIN LATERAL regexp_matches(p.content, '/api/images/([0-9a-f-]{36}\.(?:jpg|png|gif|webp))', 'g') AS m(name)
JOIN post_image i ON i.object_key = 'images/' || m.name[1]
ON CONFLICT DO NOTHING;

-- 연결이 모두 없어진 시각: 정리 작업이 이 시각부터 1일을 셈 (연결된 이미지는 NULL)
ALTER TABLE post_image ADD COLUMN unused_since TIMESTAMPTZ;
UPDATE post_image i SET unused_since = i.updated_at
WHERE NOT EXISTS (SELECT 1 FROM post_image_link l WHERE l.post_image_id = i.id);
CREATE INDEX idx_post_image_unused_since ON post_image (unused_since);

ALTER TABLE post_image DROP COLUMN post_id;
