import type { ReactNode } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import type { Route } from './+types/root'
import { INTRO_SCRIPT, Preloader, PreloaderStage } from './components/Preloader'
import { RouteError } from './components/RouteError'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
]

// 기존 index.html 역할: App, ErrorBoundary, HydrateFallback을 모두 감싸는 문서 뼈대
export function Layout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: INTRO_SCRIPT가 React보다 먼저 <html>에 data-intro 속성을 붙이므로 불일치 경고 생략
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
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
  return (
    <>
      <Outlet />
      <Preloader />
    </>
  )
}

// SPA 모드 빌드 시 index.html에 미리 렌더링되어 JS·데이터 로딩 중 표시 (프리로더 첫 화면, Z 채움은 CSS만으로 시작)
export function HydrateFallback() {
  return (
    <>
      <title>zoolog</title>
      <PreloaderStage />
    </>
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
