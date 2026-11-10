-- 스크랩 큰 주제 이름 변경: News Clipping → Tech Clipping (2026-11-10 소유자 결정)
-- 뉴스 기사뿐 아니라 기술 블로그 글도 스크랩하게 되어 이름을 넓힘. 아래 달·주 주제와 글은 그대로
-- ClipService.TOP_NAME과 같은 값이어야 함(이름에서 slug를 만들어 찾으므로, 다르면 새 큰 주제가 또 생김)
UPDATE category
SET name = 'Tech Clipping', slug = 'tech-clipping', updated_at = now()
WHERE slug = 'news-clipping' AND parent_id IS NULL;
