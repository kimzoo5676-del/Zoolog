import { DAYS, type DayOfWeek, type Schedule } from '../api/schedule'

// 날짜 계산은 서버가 준 "YYYY-MM-DD" 문자열 기준 (브라우저 시간대와 상관없이 한국 날짜 유지)
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function dayOfWeek(date: string): DayOfWeek {
  const index = new Date(`${date}T00:00:00Z`).getUTCDay() // 0 = 일요일
  return DAYS[(index + 6) % 7].value
}

export function isDueOn(schedule: Schedule, date: string): boolean {
  return (
    date >= schedule.startDate &&
    (schedule.endDate === null || date <= schedule.endDate) &&
    schedule.repeatDays.includes(dayOfWeek(date))
  )
}

// "월·수·금", 7일이면 "매일", 월~금이면 "평일"
export function repeatLabel(days: DayOfWeek[]): string {
  if (days.length === 7) return '매일'
  const weekdays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return '평일'
  return DAYS.filter((d) => days.includes(d.value))
    .map((d) => d.label)
    .join('·')
}

export function shortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}
