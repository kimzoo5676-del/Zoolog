// 뉴스 스크랩 주제 이름 (백엔드 ClipService와 같은 규칙): 달 "2026.10", 주 "2026.10 Week 3"
// 주는 월요일 시작, 1일이 들어 있는 주가 Week 1
export function clipMonthName(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function clipWeekName(date: Date) {
  const firstWeekday = (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7 // 월요일 0
  return `${clipMonthName(date)} Week ${Math.ceil((date.getDate() + firstWeekday) / 7)}`
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

// 게시될 글 본문 (백엔드 ClipService.content와 같은 모양): [기사 제목](<주소>) · 언론사 + 빈 줄 + 코멘트
// 제목의 \ [ ] 는 링크 문법이 깨지지 않도록 이스케이프, 꺾쇠로 감싼 주소는 괄호가 들어 있어도 링크 유지
export function clipMarkdown(title: string, url: string, source: string, comment: string) {
  const link = `[${title.trim().replace(/([\\[\]])/g, '\\$1')}](<${url}>)`
  return `${link}${source.trim() ? ` · ${source.trim()}` : ''}\n\n${comment.trim()}\n`
}
