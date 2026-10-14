import { csrfHeaders } from './http'

type Me = {
  email: string
}

// 비로그인은 204, 로그인 상태면 200 + 내 정보
export async function fetchMe(signal?: AbortSignal): Promise<Me | null> {
  const response = await fetch('/api/auth/me', { signal })
  if (response.status === 204) {
    return null
  }
  if (!response.ok) {
    throw new Error(`로그인 상태를 확인하지 못했어요 (HTTP ${response.status})`)
  }
  return response.json()
}

// 로그아웃은 ProblemDetail 본문이 없어 상태 코드만 표시
export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: csrfHeaders(),
  })
  if (!response.ok) {
    throw new Error(`로그아웃하지 못했어요 (HTTP ${response.status})`)
  }
}
