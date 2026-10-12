-- 주제 2단계 구조: 상위 주제(parent_id)가 NULL이면 큰 주제. 깊이 2단계 제한은 CategoryService에서 검사
ALTER TABLE category
    ADD COLUMN parent_id BIGINT REFERENCES category (id),
    ADD CONSTRAINT category_parent_not_self CHECK (parent_id <> id);
CREATE INDEX idx_category_parent_id ON category (parent_id);
