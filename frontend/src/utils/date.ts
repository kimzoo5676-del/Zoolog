const dateFormatter = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' })

// ISO-8601 UTC 문자열을 방문자 브라우저 시간대 기준 날짜로 표시 (예: 2026년 10월 12일)
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}
