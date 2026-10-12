import { href, Link, NavLink, Outlet } from 'react-router'
import { fetchCategories } from '../api/category'
import { Logo } from '../components/Logo'
import { RollText } from '../components/RollText'
import type { Route } from './+types/blog-layout'

// request.signal: 다른 링크로 이동하면 라우터가 진행 중인 요청을 취소 (기존 ignore 플래그 대체)
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { categories: await fetchCategories(request.signal) }
}

export default function BlogLayout({ loaderData }: Route.ComponentProps) {
  const { categories } = loaderData

  return (
    <div className="site-shell">
      <header className="site-header">
        {/* 첫 글자만 러스트 강조. span으로 나뉜 글자를 "Z oolog"로 띄어 읽지 않도록 aria-label 지정 */}
        <Link to="/" className="site-title" aria-label="Zoolog">
          <Logo />
        </Link>
        <nav aria-label="주제" className="site-nav">
          <ul className="category-nav">
            <li>
              {/* end: /posts/3 같은 하위 경로에서는 활성 표시하지 않음 */}
              <NavLink to="/posts" end className="roll-trigger">
                <RollText>전체</RollText>
              </NavLink>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <NavLink to={href('/categories/:slug', { slug: category.slug })} className="roll-trigger">
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
    </div>
  )
}
