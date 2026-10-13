import { useLayoutEffect, useMemo, useState } from 'react'
import { href, Link, NavLink, Outlet, useLocation, useParams, type ShouldRevalidateFunctionArgs } from 'react-router'
import { fetchMe } from '../api/auth'
import { fetchCategories } from '../api/category'
import { AuthShortcut } from '../components/AuthShortcut'
import { Logo } from '../components/Logo'
import { PointerFocusReset } from '../components/PointerFocusReset'
import { RollText } from '../components/RollText'
import { MapHighlightContext } from '../hooks/mapHighlight'
import { buildCategoryTree, type CategoryNode } from '../utils/categoryTree'
import { onlyFocusChanged } from '../utils/focusParam'
import { clearPendingNames, nameForTransition, spawnTileStars } from '../utils/viewTransition'
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
  // 메뉴를 눌러 붙인 전환 이름은 새 화면이 그려지는 순간 지움 (새 화면 제목과 겹치지 않도록)
  const { key: locationKey } = useLocation()
  useLayoutEffect(() => clearPendingNames(), [locationKey])
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
            {/* 로고 옆 칸: Streak(모두), 글쓰기(소유자 로그인 시만). 주제 메뉴와 섞이지 않도록 */}
            <NavLink
              to={href('/streak')}
              viewTransition
              className="site-brand-link roll-trigger"
              onClick={(e) => nameForTransition(e.currentTarget.querySelector('.roll'), 'streak-title')}
            >
              <RollText>Streak</RollText>
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
                    viewTransition
                    // 메뉴 글자가 주제 화면 제목 자리로 이어서 이동 (주제 칸과 같은 전환 이름 cat-<id>)
                    // 하위 주제 수만큼 ◎ 별(칸 색)이 메뉴 아래에서 튀어나와 각자의 칸 자리로 날아가며 커지다 칸이 됨 (그래프 → Card와 같은 방식)
                    onClick={(e) => {
                      const label = e.currentTarget.querySelector('.roll')
                      nameForTransition(label, `cat-${category.id}`)
                      spawnTileStars(
                        label,
                        category.children.map((child, i) => ({
                          id: child.id,
                          dark: (Math.floor(i / 2) + (i % 2)) % 2 === 1,
                        })),
                      )
                    }}
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
