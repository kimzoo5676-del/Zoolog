// 백엔드 오류 응답(RFC 9457 ProblemDetail)의 detail을 메시지로 사용, 없으면 기본 문구
export async function toApiError(response: Response, fallback: string): Promise<Error> {
  const problem: unknown = await response.json().catch(() => null)
  const detail =
    problem && typeof problem === 'object' && 'detail' in problem && typeof problem.detail === 'string'
      ? problem.detail
      : null
  return new Error(detail ?? `${fallback} (HTTP ${response.status})`)
}
