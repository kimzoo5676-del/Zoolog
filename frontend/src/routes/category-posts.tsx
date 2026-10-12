import { data, href, NavLink } from 'react-router'
import { fetchCategories } from '../api/category'
import { fetchPosts } from '../api/post'
import { MetaList } from '../components/MetaList'
import { PageHeader } from '../components/PageHeader'
import { PagedPostList } from '../components/PagedPostList'
import { RouteError } from '../components/RouteError'
import { ViewSwitch } from '../components/ViewSwitch'
import { categoryPath } from '../utils/categoryTree'
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
  const children = categories.filter((c) => c.parentId === category.id)
  return { category, ancestors, children, posts }
}

export default function CategoryPosts({ loaderData }: Route.ComponentProps) {
  const { category, ancestors, children, posts } = loaderData

  return (
    <>
      <title>{`${category.name} | zoolog`}</title>
      {/* 하위 주제 화면은 라벨 자리에 상위 경로 */}
      <PageHeader
        eyebrow={ancestors.length > 0 ? ancestors.map((c) => c.name).join(' / ') : 'Category'}
        title={category.name}
      >
        <div className="page-header-side">
          <ViewSwitch
            current="list"
            graphTo={{ pathname: '/', search: `?focus=${encodeURIComponent(category.slug)}` }}
            listTo={href('/categories/:slug', { slug: category.slug })}
          />
          <MetaList items={[{ label: 'Posts', value: String(posts.length).padStart(2, '0') }]} />
        </div>
      </PageHeader>
      {/* 마우스가 없는 기기(터치)는 머리글 펼침 메뉴를 쓸 수 없어 큰 주제 화면에 하위 주제 칸 표시 */}
      {children.length > 0 && (
        <nav aria-label="하위 주제" className="subcategory-nav">
          {children.map((child) => (
            <NavLink key={child.id} to={href('/categories/:slug', { slug: child.slug })} className="chip">
              {child.name}
            </NavLink>
          ))}
        </nav>
      )}
      {/* 하위 주제가 있으면 여러 주제 글이 섞이므로 주제 표시 */}
      <PagedPostList key={category.slug} posts={posts} showCategory={children.length > 0} />
    </>
  )
}

// 라우트 자체 ErrorBoundary: 오류 화면이 상위 레이아웃(머리글, 주제 메뉴) 안에 표시됨
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
