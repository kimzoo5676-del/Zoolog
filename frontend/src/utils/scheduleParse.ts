import type { DayOfWeek } from '../api/schedule'

// 일정 제목에서 반복 요일·시각을 알아듣는 해석기 (Todoist Quick Add, Things 날짜 입력에서 착안)
// 예: "AWS-SAA 공부 매일 7시" → 제목 "AWS-SAA 공부", 매일, 07:00
//     "토익 월수금 오후 6시 30분" → 월·수·금, 18:30 / "운동 평일 6:00" / "독서 주말 밤 10시"

export type ParsedSchedule = {
  title: string // 알아들은 말을 뺀 제목
  days?: DayOfWeek[]
  time?: string // "HH:MM"
  // 원문에서 알아들은 부분 (밑줄 표시용, 시작 위치 순)
  matches: { start: number; end: number }[]
}

const WEEK: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const KO_DAY = '월화수목금토일'
const EN_DAY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// 앞뒤가 글자(한글·영문·숫자)가 아닐 때만 인정: "수학"의 "수", "monday"가 아닌 "mond" 같은 오인식 방지
const B = '(?<![\\p{L}\\p{N}])'
const E = '(?![\\p{L}\\p{N}])'

const REPEAT_PATTERNS: { re: RegExp; days: (m: RegExpExecArray) => DayOfWeek[] }[] = [
  { re: new RegExp(`${B}(매일|everyday|daily)${E}`, 'giu'), days: () => WEEK },
  { re: new RegExp(`${B}(평일|weekdays?)${E}`, 'giu'), days: () => WEEK.slice(0, 5) },
  { re: new RegExp(`${B}(주말|weekends?)${E}`, 'giu'), days: () => WEEK.slice(5) },
  // 월수금, 월·수·금, 월,수,금, 화목 (요일 글자 2개 이상, "매주" 붙어도 됨)
  {
    re: new RegExp(`${B}(?:매주\\s*)?([${KO_DAY}](?:[·,/\\s]?[${KO_DAY}])+)(?:마다)?${E}`, 'gu'),
    days: (m) => koDays(m[1]),
  },
  // 월요일, 매주 화요일, 토요일마다
  {
    re: new RegExp(`${B}(?:매주\\s*)?([${KO_DAY}])요일(?:마다)?${E}`, 'gu'),
    days: (m) => koDays(m[1]),
  },
  // mon wed fri, mon/wed/fri
  {
    re: new RegExp(`${B}((?:${EN_DAY.join('|')})(?:[\\s,/·]+(?:${EN_DAY.join('|')}))*)${E}`, 'giu'),
    days: (m) =>
      m[1]
        .toLowerCase()
        .split(/[\s,/·]+/)
        .map((d) => WEEK[EN_DAY.indexOf(d)]),
  },
]

const TIME_PATTERNS: { re: RegExp; time: (m: RegExpExecArray) => string | undefined }[] = [
  // (오전|오후|아침|저녁|밤) 7시 (30분|반)
  {
    re: new RegExp(`${B}(?:(오전|오후|아침|저녁|밤)\\s*)?(\\d{1,2})시(?:\\s*(?:(\\d{1,2})분|(반)))?${E}`, 'gu'),
    time: (m) => toTime(m[1], Number(m[2]), m[4] ? 30 : Number(m[3] ?? 0)),
  },
  // (오전|오후) 18:30, 7:00 pm
  {
    re: new RegExp(`${B}(?:(오전|오후|아침|저녁|밤)\\s*)?(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?${E}`, 'giu'),
    time: (m) => toTime(m[1] ?? m[4]?.toLowerCase(), Number(m[2]), Number(m[3])),
  },
]

function koDays(text: string): DayOfWeek[] {
  return [...text].filter((c) => KO_DAY.includes(c)).map((c) => WEEK[KO_DAY.indexOf(c)])
}

function toTime(period: string | undefined, hour: number, minute: number): string | undefined {
  if (minute > 59 || hour > 24) return undefined
  let h = hour
  if ((period === '오후' || period === '저녁' || period === '밤' || period === 'pm') && h < 12) h += 12
  if ((period === '오전' || period === '아침' || period === 'am') && h === 12) h = 0
  if (h === 24) h = 0
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// 같은 종류가 여러 번 나오면 마지막 것을 사용 (고쳐 쓴 말을 따름)
export function parseSchedule(text: string): ParsedSchedule {
  const found: { start: number; end: number }[] = []
  let days: DayOfWeek[] | undefined
  let dayAt = -1
  let time: string | undefined
  let timeAt = -1

  for (const { re, days: toDays } of REPEAT_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const start = m.index
      const end = start + m[0].length
      if (overlaps(found, start, end)) continue
      found.push({ start, end })
      if (start > dayAt) {
        days = [...new Set(toDays(m as RegExpExecArray))].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b))
        dayAt = start
      }
    }
  }
  for (const { re, time: toT } of TIME_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const start = m.index
      const end = start + m[0].length
      const t = toT(m as RegExpExecArray)
      if (!t || overlaps(found, start, end)) continue
      found.push({ start, end })
      if (start > timeAt) {
        time = t
        timeAt = start
      }
    }
  }

  found.sort((a, b) => a.start - b.start)
  let title = ''
  let cursor = 0
  for (const { start, end } of found) {
    title += text.slice(cursor, start)
    cursor = end
  }
  title = (title + text.slice(cursor)).replace(/\s+/g, ' ').trim()
  return { title, days, time, matches: found }
}

function overlaps(list: { start: number; end: number }[], start: number, end: number) {
  return list.some((r) => start < r.end && r.start < end)
}
