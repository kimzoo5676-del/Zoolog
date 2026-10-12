import { href, redirect } from 'react-router'
import { fetchMe } from '../api/auth'

// 소유자 전용 화면의 clientLoader에서 호출: 비로그인이면 /login으로 이동
export async function requireOwner(signal?: AbortSignal) {
  const me = await fetchMe(signal)
  if (!me) {
    throw redirect(href('/login'))
  }
  return me
}
