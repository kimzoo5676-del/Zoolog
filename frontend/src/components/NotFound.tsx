import { Link } from 'react-router'
import { PageHeader } from './PageHeader'

type NotFoundProps = {
  message?: string
}

export function NotFound({ message = '페이지를 찾을 수 없어요' }: NotFoundProps) {
  return (
    <>
      <title>찾을 수 없음 | zoolog</title>
      <PageHeader eyebrow="404 Not Found" title={message} />
      <div className="page-section">
        <Link to="/" className="button-link">
          글 목록으로 돌아가기
        </Link>
      </div>
    </>
  )
}
