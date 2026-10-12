import { data, href, Link } from 'react-router'
import { fetchPost } from '../api/post'
import { MarkdownContent } from '../components/MarkdownContent'
import { RouteError } from '../components/RouteError'
import { formatDate } from '../utils/date'
import type { Route } from './+types/post-detail'

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  // /posts/abc 같은 숫자가 아닌 id는 API 호출 없이 404
  if (!/^[1-9]\d*$/.test(params.postId)) {
    throw data('글을 찾을 수 없어요.', { status: 404 })
  }
  const post = await fetchPost(Number(params.postId), request.signal)
  if (!post) {
    throw data('글을 찾을 수 없어요.', { status: 404 })
  }
  return { post }
}

export default function PostDetail({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData

  return (
    <article>
      <title>{`${post.title} | zoolog`}</title>
      <header className="post-header">
        <Link to={href('/categories/:slug', { slug: post.categorySlug })} className="post-category">
          {post.categoryName}
        </Link>
        <h1 className="page-title">{post.title}</h1>
        <p className="post-meta">
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
        </p>
      </header>
      <MarkdownContent>{post.content}</MarkdownContent>
    </article>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
