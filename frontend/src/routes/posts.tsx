import { fetchPosts } from '../api/post'
import { MetaList } from '../components/MetaList'
import { PageHeader } from '../components/PageHeader'
import { PagedPostList } from '../components/PagedPostList'
import { RouteError } from '../components/RouteError'
import { ViewSwitch } from '../components/ViewSwitch'
import type { Route } from './+types/posts'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { posts: await fetchPosts({ signal: request.signal }) }
}

// 전체 글 목록: 홈 그래프의 "목록" 보기 (확대하지 않은 상태에서 목록을 고르면 여기로)
export default function Posts({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData

  return (
    <>
      <title>전체 | zoolog</title>
      <PageHeader eyebrow="List" title="전체">
        <div className="page-header-side">
          <ViewSwitch current="list" graphTo="/" listTo="/posts" />
          <MetaList items={[{ label: 'Posts', value: String(posts.length).padStart(2, '0') }]} />
        </div>
      </PageHeader>
      <PagedPostList posts={posts} />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
