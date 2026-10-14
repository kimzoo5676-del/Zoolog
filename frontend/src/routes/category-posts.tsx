import { data, href } from 'react-router'
import { fetchCategories } from '../api/category'
import { fetchPosts } from '../api/post'
import { MetaList } from '../components/MetaList'
import { PageHeader } from '../components/PageHeader'
import { CategoryTiles } from '../components/CategoryTiles'
import { PostCards } from '../components/PostCards'
import { RouteError } from '../components/RouteError'
import { ViewSwitch } from '../components/ViewSwitch'
import { categoryPath, childTiles } from '../utils/categoryTree'
import { categoryTitleTransition } from '../utils/viewTransition'
import type { Route } from './+types/category-posts'

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  // 제목에 쓸 주제 이름 확인과 글 목록 조회를 동시에 요청 (없는 slug는 API가 []를 반환하므로 주제 목록으로 판별)
  const [categories, posts] = await Promise.all([
    fetchCategories(request.signal),
    fetchPosts({ category: params.slug, signal: request.signal }),
  ])
  const category = categories.find((c) => c.slug === params.slug)
  if (!category) {
    throw data('주제를 찾을 수 없어요', { status: 404 })
  }
  // 상위 경로 (큰 주제부터, 자기 자신 제외): 라벨 자리에 "Cloud Engineer / AWS-SAA"
  const ancestors = categoryPath(categories, category.id).slice(0, -1)
  // 하위 주제 칸: 각 하위 주제 아래 모든 단계의 글 수
  const tiles = childTiles(categories, posts, category.id)
  // 글 카드는 이 주제에 바로 쓴 글만 (하위 주제 글은 그 칸으로 들어가서 봄)
  const ownPosts = posts.filter((p) => p.categorySlug === category.slug)
  return { category, ancestors, tiles, ownPosts, totalPosts: posts.length }
}

// 주제 화면 (2026-10-13 소유자 결정): 글 목록을 한 번에 보여 주지 않음
// 큰 주제는 하위 주제 칸 한 줄 2칸, 하위 주제는 한 줄 4칸, 이 주제에 바로 쓴 글은 카드(한 줄 8개)
// 하위 주제 칸을 누르면 그 이름이 다음 화면 제목 자리로 이어서 이동 (칸 이름과 제목이 주제 id로 같은 전환 이름)
export default function CategoryPosts({ loaderData }: Route.ComponentProps) {
  const { category, ancestors, tiles, ownPosts, totalPosts } = loaderData
  const isTop = category.parentId === null

  return (
    <>
      <title>{`${category.name} | zoolog`}</title>
      {/* 하위 주제 화면은 라벨 자리에 상위 경로 */}
      <PageHeader
        eyebrow={ancestors.length > 0 ? ancestors.map((c) => c.name).join(' / ') : 'Category'}
        title={category.name}
        titleStyle={categoryTitleTransition(category.id, true)}
      >
        <div className="page-header-side">
          <ViewSwitch
            current="list"
            graphTo={{ pathname: '/', search: `?focus=${encodeURIComponent(category.slug)}` }}
            listTo={href('/categories/:slug', { slug: category.slug })}
          />
          <MetaList items={[{ label: 'Posts', value: String(totalPosts).padStart(2, '0') }]} />
        </div>
      </PageHeader>
      {/* 큰 주제는 하위 주제가 없어도 칸 판(빈 줄)이 기본 화면 (큰 주제에는 글을 쓰지 않음, 2026-10-13) */}
      {(tiles.length > 0 || isTop) && (
        <CategoryTiles key={`tiles-${category.slug}`} tiles={tiles} columns={isTop ? 2 : 4} />
      )}
      {/* 하위 주제가 없는 하위 주제(세부 주제 등)는 글 카드 판 (글이 없어도 빈 줄) */}
      {(ownPosts.length > 0 || (tiles.length === 0 && !isTop)) && (
        <PostCards key={`cards-${category.slug}`} posts={ownPosts} />
      )}
    </>
  )
}

// 라우트 자체 ErrorBoundary: 오류 화면이 상위 레이아웃(머리글, 주제 메뉴) 안에 표시됨
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
