// 뉴스 스크랩 주제 이름 (백엔드 ClipService와 같은 규칙): 달 "2026.10", 주 "2026.10 3주"
// 주는 월요일 시작, 1일이 들어 있는 주가 1주
export function clipMonthName(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function clipWeekName(date: Date) {
  const firstWeekday = (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7 // 월요일 0
  return `${clipMonthName(date)} ${Math.ceil((date.getDate() + firstWeekday) / 7)}주`
}

// "2026-10-14" → 그 날짜 (시간대 영향 없이 날짜만)
export function parseClipDate(value: string | null): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function isHttpUrl(value: string | null) {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
