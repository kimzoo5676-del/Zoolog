import { Form } from 'react-router'
import { fetchMe, logout } from '../api/auth'
import { PageHeader } from '../components/PageHeader'
import { RouteError } from '../components/RouteError'
import type { Route } from './+types/login'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return {
    me: await fetchMe(request.signal),
    // 백엔드가 로그인 실패(소유자 아닌 계정, 동의 취소 등) 시 /login?error로 이동시킴
    failed: new URL(request.url).searchParams.has('error'),
  }
}

// 로그아웃 후 라우터가 clientLoader를 다시 실행해 화면이 비로그인 상태로 바뀜
export async function clientAction() {
  await logout()
  return null
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { me, failed } = loaderData

  return (
    <>
      <title>로그인 | zoolog</title>
      <PageHeader title="로그인" />
      <div className="page-section">
        {me ? (
          <>
            <p>{me.email}</p>
            <Form method="post">
              <button type="submit" className="button-link">
                로그아웃
              </button>
            </Form>
          </>
        ) : (
          <>
            {failed && <p>로그인하지 못했어요. 소유자 Google 계정으로 다시 시도해 주세요.</p>}
            {/* 라우터 이동이 아닌 전체 페이지 이동: 백엔드가 Google 동의 화면으로 리다이렉트 */}
            <a href="/oauth2/authorization/google" className="button-link">
              Google로 로그인
            </a>
          </>
        )}
      </div>
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
