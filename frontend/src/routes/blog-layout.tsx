import { href, Link, NavLink, Outlet } from 'react-router'
import { fetchCategories } from '../api/category'
import type { Route } from './+types/blog-layout'

// request.signal: 다른 링크로 이동하면 라우터가 진행 중인 요청을 취소 (기존 ignore 플래그 대체)
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { categories: await fetchCategories(request.signal) }
}

export default function BlogLayout({ loaderData }: Route.ComponentProps) {
  const { categories } = loaderData

  return (
    <>
      <header className="site-header">
        <Link to="/" className="site-title">
          zoolog
        </Link>
        <nav aria-label="주제">
          <ul className="category-nav">
            <li>
              {/* end: /posts/3 같은 하위 경로에서는 활성 표시하지 않음 */}
              <NavLink to="/posts" end>
                전체
              </NavLink>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <NavLink to={href('/categories/:slug', { slug: category.slug })}>{category.name}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </>
  )
}
