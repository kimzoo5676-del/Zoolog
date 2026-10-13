import { data, Form, href, Link, redirect } from 'react-router'
import { deletePost, fetchPost } from '../api/post'
import { MarkdownContent } from '../components/MarkdownContent'
import { MetaList } from '../components/MetaList'
import { RouteError } from '../components/RouteError'
import { ViewSwitch } from '../components/ViewSwitch'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { formatDate } from '../utils/date'
import { nameForTransition } from '../utils/viewTransition'
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
  return redirect('/')
}

export default function PostDetail({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData
  const { me } = useBlogLayoutData()

  return (
    <article>
      <title>{`${post.title} | zoolog`}</title>
      <header className="post-header">
        {/* 보기 전환: 이 글의 주제를 그래프(확대) 또는 목록으로. 글 화면은 어느 쪽도 선택되지 않음 */}
        <ViewSwitch
          graphTo={{ pathname: '/', search: `?focus=${encodeURIComponent(post.categorySlug)}` }}
          listTo={href('/categories/:slug', { slug: post.categorySlug })}
          className="view-switch post-view-switch"
        />
        {/* 그래프의 글 별을 눌러 들어오면 별 자리의 제목이 이 자리로 이동 (view-transition-name: post-title) */}
        {/* data-post-id: 뒤로 가거나 주제 화면으로 갈 때 이 글의 카드가 제목을 이어받도록 (PostCards) */}
        <h1 className="post-title" data-post-id={post.id}>
          {post.title}
        </h1>
      </header>
      <MetaList
        className="meta-cells"
        items={[
          {
            label: 'Category',
            // 주제 이름이 주제 화면 제목 자리로 이어서 이동 (머리글 메뉴와 같은 방식, cat-<id>)
            value: (
              <Link
                to={href('/categories/:slug', { slug: post.categorySlug })}
                viewTransition
                onClick={(e) => nameForTransition(e.currentTarget, `cat-${post.categoryId}`)}
              >
                {post.categoryName}
              </Link>
            ),
          },
          { label: 'Date', value: <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time> },
        ]}
      />
      {me && (
        <div className="owner-actions">
          {/* 글 제목이 편집기 제목 칸으로 이어서 이동 (편집기 제목 칸도 post-title) */}
          <Link to={href('/posts/:postId/edit', { postId: String(post.id) })} viewTransition className="button-link">
            수정
          </Link>
          <Form
            method="post"
            viewTransition
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
      {/* 정보 칸과 본문 사이 러스트 막대 (장식) */}
      <div className="post-band" aria-hidden="true" />
      <div className="page-section">
        <MarkdownContent>{post.content}</MarkdownContent>
      </div>
    </article>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
