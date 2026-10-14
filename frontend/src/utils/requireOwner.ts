import { href, redirect } from 'react-router'
import { fetchMe } from '../api/auth'
import { rememberLoginReturn } from './loginReturn'

// 소유자 전용 화면의 clientLoader에서 호출: 비로그인이면 /login으로 이동
// returnTo: 로그인 후 돌아올 주소 (메일 링크처럼 주소에 정보가 담긴 화면)
export async function requireOwner(signal?: AbortSignal, returnTo?: string) {
  const me = await fetchMe(signal)
  if (!me) {
    if (returnTo) rememberLoginReturn(returnTo)
    throw redirect(href('/login'))
  }
  return me
}
