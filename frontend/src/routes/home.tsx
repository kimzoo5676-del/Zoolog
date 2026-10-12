import { useSearchParams, type ShouldRevalidateFunctionArgs } from 'react-router'
import { fetchPosts } from '../api/post'
import { ConstellationMap } from '../components/ConstellationMap'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { onlyFocusChanged } from '../utils/focusParam'
import type { Route } from './+types/home'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { posts: await fetchPosts({ signal: request.signal }) }
}

// 지도 확대(?focus=)만 바뀌면 글 목록을 다시 불러오지 않음
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  return onlyFocusChanged(currentUrl, nextUrl) ? false : defaultShouldRevalidate
}

// 홈: 머리글 아래 화면 전체가 별자리 지도 (2026-10-12 소유자 결정)
// 별을 누르면 지도 안에서 그 별자리로 확대 (?focus=slug), 글 목록은 "목록으로 보기"로 주제 화면에서
export default function Home({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData
  const { categories } = useBlogLayoutData()
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <>
      <title>zoolog</title>
      <h1 className="visually-hidden">Zoolog</h1>
      {categories.length > 0 ? (
        <ConstellationMap
          categories={categories}
          posts={posts}
          focusSlug={searchParams.get('focus')}
          // 확대 단계마다 방문 기록을 남겨 브라우저 뒤로 가기로 한 단계씩 축소
          onFocusChange={(slug) => setSearchParams(slug ? { focus: slug } : {}, { preventScrollReset: true })}
        />
      ) : (
        <p className="empty-message">아직 글이 없어요.</p>
      )}
    </>
  )
}
