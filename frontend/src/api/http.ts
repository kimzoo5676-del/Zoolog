// API 호출 공통 함수: 조회(GET)는 상태 코드를 붙인 기본 문구, 쓰기는 백엔드 ProblemDetail의 detail을 메시지로 사용

// 백엔드 오류 응답(RFC 9457 ProblemDetail)의 detail을 메시지로 사용, 없으면 기본 문구
export async function toApiError(response: Response, fallback: string): Promise<Error> {
  const problem: unknown = await response.json().catch(() => null)
  const detail =
    problem && typeof problem === 'object' && 'detail' in problem && typeof problem.detail === 'string'
      ? problem.detail
      : null
  return new Error(detail ?? `${fallback} (HTTP ${response.status})`)
}

// Spring Security csrf.spa(): 서버가 준 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 되돌려 보내야 쓰기 요청 허용
export function csrfHeaders(): Record<string, string> {
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length)
  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}
}

// 조회: 실패하면 "문구 (HTTP 상태)" 오류
export async function getJson<T>(url: string, fallback: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`${fallback} (HTTP ${response.status})`)
  }
  return response.json() as Promise<T>
}

// 쓰기(소유자 전용): CSRF 헤더 포함, body가 있으면 JSON으로 보내고 응답 본문은 호출한 쪽이 읽음
export async function send(method: 'POST' | 'PUT' | 'DELETE', url: string, fallback: string, body?: unknown): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? csrfHeaders() : { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw await toApiError(response, fallback)
  }
  return response
}

export async function sendJson<T>(method: 'POST' | 'PUT', url: string, body: unknown, fallback: string): Promise<T> {
  return (await send(method, url, fallback, body)).json() as Promise<T>
}
