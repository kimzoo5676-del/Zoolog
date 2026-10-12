import { redirect } from 'react-router'

// 홈 쇼릴(CLAUDE.md 다음 작업) 구현 전까지 전체 글 목록으로 이동
export function clientLoader() {
  throw redirect('/posts')
}

export default function Home() {
  return null
}
