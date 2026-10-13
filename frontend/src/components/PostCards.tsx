import { useState, type CSSProperties } from 'react'
import { href, Link, useViewTransitionState } from 'react-router'
import type { PostSummary } from '../api/post'
import { useEnteredInTransition } from '../utils/viewTransition'
import { RollText } from './RollText'

const PAGE_SIZE = 24 // 한 줄 8·4·2개 어느 쪽이든 줄이 꽉 차는 수

// 글 카드 (2026-10-13 소유자 결정: 목록 대신 카드, 한 줄에 8개. 좁은 화면 4개·2개, 하위 주제 칸과 같은 바둑판 색)
// 누르면 주제 칸과 같은 방식: 카드 제목이 글 화면 제목 자리로 이어서 이동(post-title), 판은 서서히 흐려짐(category-board)
// 글이 많으면 24개씩 "더 보기". 주제가 바뀌면 처음부터 보이도록 부모에서 key로 초기화
export function PostCards({ posts }: { posts: PostSummary[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const entered = useEnteredInTransition()
  const shown = posts.slice(0, visible)

  return (
    <>
      <ul className={entered ? 'post-cards is-vt' : 'post-cards'} aria-label="글">
        {shown.map((post, i) => (
          <li
            key={post.id}
            className={leavingPost(post.id) ? 'post-card is-return' : 'post-card'}
            style={{ '--i': i } as CSSProperties}
          >
            <CardLink post={post} />
          </li>
        ))}
        {/* 빈 칸: 마지막 줄을 바둑판 색으로 채움 (8칸 기준, 4·2칸 화면에서도 줄이 맞음). 글이 없으면 한 줄 */}
        {Array.from({ length: emptyCount(shown.length) }, (_, k) => (
          <li
            key={`empty-${k}`}
            className="post-card is-empty"
            style={{ '--i': shown.length + k } as CSSProperties}
            aria-hidden="true"
          />
        ))}
      </ul>
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

function emptyCount(count: number): number {
  return count === 0 ? 8 : (8 - (count % 8)) % 8
}

// 누른 카드 제목만 view-transition-name "post-title"을 가짐 (글 화면 제목과 짝)
function CardLink({ post }: { post: PostSummary }) {
  const to = href('/posts/:postId', { postId: String(post.id) })
  // 글 화면에서 돌아올 때(뒤로 가기, 주제 링크): 방금 보던 글의 제목이 이 카드로 되돌아옴
  const isTransitioning = useViewTransitionState(to) || leavingPost(post.id)
  return (
    <Link to={to} viewTransition className="post-card-link roll-trigger">
      <span className="post-card-title" style={isTransitioning ? { viewTransitionName: 'post-title' } : undefined}>
        <RollText>{post.title}</RollText>
      </span>
    </Link>
  )
}

// 화면 전환으로 새 화면을 그리는 순간에는 떠나는 글 화면이 아직 문서에 있음 → 그 글의 제목(h1)이면 이 카드가 짝
function leavingPost(id: number) {
  return typeof document !== 'undefined' && document.querySelector(`h1.post-title[data-post-id="${id}"]`) !== null
}
