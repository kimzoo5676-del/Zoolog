-- 스크랩한 기사 주소 (2026-10-14 소유자 결정: 같은 기사를 두 번 스크랩하지 않도록)
-- 글을 지우면 기록도 지워져 다시 스크랩 가능 (ON DELETE CASCADE)
CREATE TABLE news_clip (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url        VARCHAR(2000) NOT NULL UNIQUE,
    post_id    BIGINT        NOT NULL UNIQUE REFERENCES post (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL
);

-- 이미 게시한 스크랩 글(News Clipping 아래, 본문 첫 줄 "[기사 제목](<주소>)")의 주소도 기록. 같은 주소가 여럿이면 먼저 쓴 글
WITH RECURSIVE clipping AS (
    SELECT id FROM category WHERE slug = 'news-clipping' AND parent_id IS NULL
    UNION ALL
    SELECT c.id FROM category c JOIN clipping ON c.parent_id = clipping.id
)
INSERT INTO news_clip (url, post_id, created_at, updated_at)
SELECT DISTINCT ON (url) url, id, created_at, created_at
FROM (
    SELECT p.id, p.created_at, substring(p.content FROM '\]\(<([^>]+)>\)') AS url
    FROM post p
    WHERE p.category_id IN (SELECT id FROM clipping) AND p.content LIKE '[%'
) found
WHERE url IS NOT NULL
ORDER BY url, created_at, id;
