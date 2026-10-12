import { href, Link } from 'react-router'
import type { PostSummary } from '../api/post'
import { formatDate } from '../utils/date'

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
      {posts.map((post) => (
        <li key={post.id} className="post-list-item">
          <Link to={href('/posts/:postId', { postId: String(post.id) })} className="post-list-title">
            {post.title}
          </Link>
          <p className="post-meta">
            {showCategory && <span>{post.categoryName} · </span>}
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          </p>
        </li>
      ))}
    </ul>
  )
}
