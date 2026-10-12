export type Me = {
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

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: csrfHeaders(),
  })
  if (!response.ok) {
    throw new Error(`로그아웃하지 못했어요 (HTTP ${response.status})`)
  }
}

// Spring Security csrf.spa(): 서버가 준 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 되돌려 보내야 쓰기 요청 허용
export function csrfHeaders(): Record<string, string> {
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length)
  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}
}
