import { href, Link } from 'react-router'
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
              <Link to={href('/posts/:postId', { postId: String(post.id) })}>
                <RollText>{post.title}</RollText>
              </Link>
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
