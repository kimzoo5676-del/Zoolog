import { data, href, Link } from 'react-router'
import { fetchPost } from '../api/post'
import { Halftone } from '../components/Halftone'
import { MarkdownContent } from '../components/MarkdownContent'
import { MetaList } from '../components/MetaList'
import { RouteError } from '../components/RouteError'
import { formatDate } from '../utils/date'
import type { Route } from './+types/post-detail'

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  // /posts/abc 같은 숫자가 아닌 id는 API 호출 없이 404
  if (!/^[1-9]\d*$/.test(params.postId)) {
    throw data('글을 찾을 수 없어요', { status: 404 })
  }
  const post = await fetchPost(Number(params.postId), request.signal)
  if (!post) {
    throw data('글을 찾을 수 없어요', { status: 404 })
  }
  return { post }
}

export default function PostDetail({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData

  return (
    <article>
      <title>{`${post.title} | zoolog`}</title>
      <header className="post-header">
        <h1 className="post-title">{post.title}</h1>
      </header>
      <MetaList
        className="meta-cells"
        items={[
          {
            label: 'Category',
            value: <Link to={href('/categories/:slug', { slug: post.categorySlug })}>{post.categoryName}</Link>,
          },
          { label: 'Date', value: <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time> },
        ]}
      />
      <Halftone className="post-band" />
      <div className="page-section">
        <MarkdownContent>{post.content}</MarkdownContent>
      </div>
    </article>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
