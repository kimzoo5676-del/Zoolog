import { data } from 'react-router'
import { fetchCategories } from '../api/category'
import { fetchPosts } from '../api/post'
import { PostList } from '../components/PostList'
import { RouteError } from '../components/RouteError'
import type { Route } from './+types/category-posts'

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  // 제목에 쓸 주제 이름 확인과 글 목록 조회를 동시에 요청 (없는 slug는 API가 []를 반환하므로 주제 목록으로 판별)
  const [categories, posts] = await Promise.all([
    fetchCategories(request.signal),
    fetchPosts({ category: params.slug, signal: request.signal }),
  ])
  const category = categories.find((c) => c.slug === params.slug)
  if (!category) {
    throw data('주제를 찾을 수 없어요.', { status: 404 })
  }
  return { category, posts }
}

export default function CategoryPosts({ loaderData }: Route.ComponentProps) {
  const { category, posts } = loaderData

  return (
    <>
      <title>{`${category.name} | zoolog`}</title>
      <h1 className="page-title">{category.name}</h1>
      <PostList posts={posts} showCategory={false} />
    </>
  )
}

// 라우트 자체 ErrorBoundary: 오류 화면이 상위 레이아웃(머리글, 주제 메뉴) 안에 표시됨
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
