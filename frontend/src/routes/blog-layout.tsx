import { useMemo, useState } from 'react'
import { href, Link, NavLink, Outlet, useParams, type ShouldRevalidateFunctionArgs } from 'react-router'
import { fetchMe } from '../api/auth'
import { fetchCategories } from '../api/category'
import { AuthShortcut } from '../components/AuthShortcut'
import { Logo } from '../components/Logo'
import { PointerFocusReset } from '../components/PointerFocusReset'
import { RollText } from '../components/RollText'
import { MapHighlightContext } from '../hooks/mapHighlight'
import { buildCategoryTree, type CategoryNode } from '../utils/categoryTree'
import { onlyFocusChanged } from '../utils/focusParam'
import type { Route } from './+types/blog-layout'

// request.signal: 다른 링크로 이동하면 라우터가 진행 중인 요청을 취소 (기존 ignore 플래그 대체)
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const [categories, me] = await Promise.all([fetchCategories(request.signal), fetchMe(request.signal)])
  return { categories, me }
}

// 홈 지도 확대(?focus=)만 바뀌면 주제 목록·로그인 상태를 다시 불러오지 않음
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  return onlyFocusChanged(currentUrl, nextUrl) ? false : defaultShouldRevalidate
}

export default function BlogLayout({ loaderData }: Route.ComponentProps) {
  const { categories, me } = loaderData
  const tree = buildCategoryTree(categories)
  // 아래 단계 주제 화면이면 그 큰 주제 메뉴도 활성 표시
  const { slug: currentSlug } = useParams()
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null)
  const highlight = useMemo(() => ({ slug: highlightSlug, setSlug: setHighlightSlug }), [highlightSlug])

  return (
    <MapHighlightContext value={highlight}>
      <div className="site-shell">
        <header className="site-header">
          {/* 첫 글자만 러스트 강조. span으로 나뉜 글자를 "Z oolog"로 띄어 읽지 않도록 aria-label 지정 */}
          <div className="site-brand">
            <Link to="/" className="site-title" aria-label="Zoolog">
              <Logo />
            </Link>
            {/* 로고 옆 칸: 일정(모두), 글쓰기(소유자 로그인 시만). 주제 메뉴와 섞이지 않도록 */}
            <NavLink to={href('/schedules')} className="site-brand-link roll-trigger">
              <RollText>일정</RollText>
            </NavLink>
            {me && (
              <NavLink to={href('/posts/new')} className="site-brand-link roll-trigger">
                <RollText>글쓰기</RollText>
              </NavLink>
            )}
          </div>
          <nav aria-label="주제" className="site-nav">
            <ul className="category-nav">
              {tree.map((category) => (
                <li key={category.id}>
                  {/* 가리키면(마우스·키보드) 홈 별자리 지도에서 이 주제의 별자리에 불이 들어옴 */}
                  <NavLink
                    to={href('/categories/:slug', { slug: category.slug })}
                    className={({ isActive }) =>
                      isActive || hasSlug(category.children, currentSlug) ? 'roll-trigger is-active' : 'roll-trigger'
                    }
                    onPointerEnter={() => setHighlightSlug(category.slug)}
                    onPointerLeave={() => setHighlightSlug(null)}
                    onFocus={() => setHighlightSlug(category.slug)}
                    onBlur={() => setHighlightSlug(null)}
                  >
                    <RollText>{category.name}</RollText>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="site-main">
          <Outlet />
        </main>
        <AuthShortcut />
        <PointerFocusReset />
      </div>
    </MapHighlightContext>
  )
}

// 하위 주제(모든 단계) 중 현재 주소의 주제가 있는지: 그 큰 주제 메뉴도 활성 표시
function hasSlug(nodes: CategoryNode[], slug: string | undefined): boolean {
  return !!slug && nodes.some((node) => node.slug === slug || hasSlug(node.children, slug))
}
