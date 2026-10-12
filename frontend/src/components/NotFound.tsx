import { Link } from 'react-router'

type NotFoundProps = {
  message?: string
}

export function NotFound({ message = '요청한 페이지를 찾을 수 없어요.' }: NotFoundProps) {
  return (
    <section className="status-message">
      <title>찾을 수 없음 | zoolog</title>
      <h1>404</h1>
      <p>{message}</p>
      <Link to="/posts">글 목록으로 돌아가기</Link>
    </section>
  )
}
