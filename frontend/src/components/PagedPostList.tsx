import { useState } from 'react'
import type { PostSummary } from '../api/post'
import { PostList } from './PostList'

const PAGE_SIZE = 20

type PagedPostListProps = {
  posts: PostSummary[]
  showCategory?: boolean
}

// 글이 많아도 처음에는 20개만, "더 보기"로 20개씩 이어서 표시 (한 번에 수백 행을 그리지 않음)
// 주제가 바뀌면 처음부터 보이도록 부모에서 key로 초기화
export function PagedPostList({ posts, showCategory }: PagedPostListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const shown = posts.slice(0, visible)

  return (
    <>
      <PostList posts={shown} showCategory={showCategory} />
      {posts.length > visible && (
        <div className="more-row">
          <button type="button" className="more-button" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            더 보기
            <span className="more-count">
              {shown.length} / {posts.length}
            </span>
          </button>
        </div>
      )}
    </>
  )
}
