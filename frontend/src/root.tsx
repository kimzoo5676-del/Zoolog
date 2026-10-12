import type { ReactNode } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import type { Route } from './+types/root'
import { RouteError } from './components/RouteError'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
]

// 기존 index.html 역할: App, ErrorBoundary, HydrateFallback을 모두 감싸는 문서 뼈대
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

// SPA 모드 빌드 시 index.html에 미리 렌더링되어 JS 로딩 중 표시
export function HydrateFallback() {
  return (
    <main className="site-main">
      <title>zoolog</title>
      <p className="empty-message">불러오는 중...</p>
    </main>
  )
}

// 하위 라우트에서 처리하지 못한 오류의 마지막 처리 지점 (예: 백엔드 중단으로 주제 목록 조회 실패)
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <main className="site-main">
      <RouteError error={error} />
    </main>
  )
}
