import { isRouteErrorResponse } from 'react-router'
import { NotFound } from './NotFound'
import { PageHeader } from './PageHeader'

type RouteErrorProps = {
  error: unknown
}

// 라우트 ErrorBoundary 공용 화면: clientLoader에서 throw data(..., { status: 404 })는 404 화면, 그 외는 일반 오류 화면
export function RouteError({ error }: RouteErrorProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound message={typeof error.data === 'string' ? error.data : undefined} />
  }

  return (
    <>
      <title>오류 | zoolog</title>
      <PageHeader eyebrow="Error" title="문제가 생겼어요">
        <p>잠시 후 다시 시도해 주세요.</p>
      </PageHeader>
      {import.meta.env.DEV && error instanceof Error && (
        <div className="page-section">
          <pre className="error-detail">{error.message}</pre>
        </div>
      )}
    </>
  )
}
