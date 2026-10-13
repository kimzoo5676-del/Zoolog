import { useState, type CSSProperties } from 'react'
import { href, Link } from 'react-router'
import type { PostSummary } from '../api/post'
import { RollText } from './RollText'

const PAGE_SIZE = 24 // 한 줄 8·4·2개 어느 쪽이든 줄이 꽉 차는 수

// 글 카드 (2026-10-13 소유자 결정: 목록 대신 카드, 한 줄에 8개. 좁은 화면 4개·2개, 하위 주제 칸과 같은 바둑판 색)
// 누르면 화면 전체가 살짝 흐려지며 글 화면으로 (공유 요소 없이 화면 전환만)
// 글이 많으면 24개씩 "더 보기". 주제가 바뀌면 처음부터 보이도록 부모에서 key로 초기화
export function PostCards({ posts }: { posts: PostSummary[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const shown = posts.slice(0, visible)

  return (
    <>
      <ul className="post-cards" aria-label="글">
        {shown.map((post, i) => (
          <li key={post.id} className="post-card" style={{ '--i': i } as CSSProperties}>
            <Link
              to={href('/posts/:postId', { postId: String(post.id) })}
              viewTransition
              onClick={markFadeTransition}
              className="post-card-link roll-trigger"
            >
              <span className="post-card-title">
                <RollText>{post.title}</RollText>
              </span>
            </Link>
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

// 이번 화면 전환만 페이드 방식으로 (index.css :root[data-vt="fade"]), 전환이 끝날 즈음 표시를 지움
function markFadeTransition() {
  document.documentElement.dataset.vt = 'fade'
  window.setTimeout(() => delete document.documentElement.dataset.vt, 1200)
}
