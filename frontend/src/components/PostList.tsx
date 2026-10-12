import { href, Link, useViewTransitionState } from 'react-router'
import type { PostSummary } from '../api/post'
import { formatDate } from '../utils/date'
import { RollText } from './RollText'

type PostListProps = {
  posts: PostSummary[]
  showCategory?: boolean
}

export function PostList({ posts, showCategory = true }: PostListProps) {
  if (posts.length === 0) {
    return <p className="empty-message">아직 글이 없어요.</p>
  }

  return (
    <ul className="post-list">
      {posts.map((post, index) => (
        <li key={post.id} className="post-row roll-trigger">
          {/* 순서 번호는 장식, 목록 의미는 ul이 전달 */}
          <div className="post-row-index" aria-hidden="true">
            <span className="post-row-number">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="post-row-main">
            <h2 className="post-row-title">
              <PostTitleLink post={post} />
            </h2>
            <p className="post-row-meta">
              {showCategory && <span>{post.categoryName}</span>}
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// 목록 제목 → 글 화면 제목: 누른 제목만 view-transition-name "post-title"을 가져(목적지 링크만 true)
// 화면 전환 때 글 화면 제목 자리로 이어서 이동·확대 (공유 요소 전환, 그래프의 글 별과 같은 방식)
function PostTitleLink({ post }: { post: PostSummary }) {
  const to = href('/posts/:postId', { postId: String(post.id) })
  const isTransitioning = useViewTransitionState(to)

  return (
    <Link to={to} viewTransition style={isTransitioning ? { viewTransitionName: 'post-title' } : undefined}>
      <RollText>{post.title}</RollText>
    </Link>
  )
}
