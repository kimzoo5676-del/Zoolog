import { fetchPosts } from '../api/post'
import { CategoryTiles } from '../components/CategoryTiles'
import { MetaList } from '../components/MetaList'
import { PageHeader } from '../components/PageHeader'
import { RouteError } from '../components/RouteError'
import { ViewSwitch } from '../components/ViewSwitch'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { descendantIds } from '../utils/categoryTree'
import type { Route } from './+types/posts'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { posts: await fetchPosts({ signal: request.signal }) }
}

// Category(2026-10-13 이전 이름 전체): 홈 그래프의 Card 보기 (확대하지 않은 상태에서 Card를 고르면 여기로)
// 2026-10-13 소유자 결정: 글 목록 대신 큰 주제 바둑판(한 줄 2칸), 누르면 주제 화면으로 이름이 이어서 이동
// 홈 그래프의 Card 글자가 이 화면 제목 자리로 이동하며 Category로 바뀜 (view-title)
export default function Posts({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData
  const { categories } = useBlogLayoutData()
  const tiles = categories
    .filter((c) => c.parentId === null)
    .map((top) => {
      const ids = descendantIds(categories, top.id)
      const slugs = new Set(categories.filter((c) => ids.has(c.id)).map((c) => c.slug))
      return { category: top, postCount: posts.filter((p) => slugs.has(p.categorySlug)).length }
    })

  return (
    <>
      <title>Category | zoolog</title>
      <PageHeader title="Category" titleStyle={{ viewTransitionName: 'view-title' }}>
        <div className="page-header-side">
          <ViewSwitch current="list" graphTo="/" listTo="/posts" />
          <MetaList items={[{ label: 'Posts', value: String(posts.length).padStart(2, '0') }]} />
        </div>
      </PageHeader>
      <CategoryTiles tiles={tiles} columns={2} quick />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
