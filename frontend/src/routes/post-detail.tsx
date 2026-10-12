import { data, Form, href, Link, redirect } from 'react-router'
import { deletePost, fetchPost } from '../api/post'
import { Halftone } from '../components/Halftone'
import { MarkdownContent } from '../components/MarkdownContent'
import { MetaList } from '../components/MetaList'
import { RouteError } from '../components/RouteError'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
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

// 삭제 버튼(소유자 전용) 제출 시 실행. 실패하면 ErrorBoundary가 오류 화면 표시
export async function clientAction({ params }: Route.ClientActionArgs) {
  await deletePost(Number(params.postId))
  return redirect(href('/posts'))
}

export default function PostDetail({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData
  const { me } = useBlogLayoutData()

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
      {me && (
        <div className="owner-actions">
          <Link to={href('/posts/:postId/edit', { postId: String(post.id) })} className="button-link">
            수정
          </Link>
          <Form
            method="post"
            onSubmit={(event) => {
              if (!window.confirm('이 글을 삭제할까요? 되돌릴 수 없어요.')) {
                event.preventDefault()
              }
            }}
          >
            <button type="submit" className="button-link">
              삭제
            </button>
          </Form>
        </div>
      )}
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
