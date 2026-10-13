import { csrfHeaders } from './auth'
import { toApiError } from './error'

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

// 화면 표시는 영문 약어(2026-10-13 소유자 결정), 화면 읽기 프로그램용은 한국어 요일
export const DAYS: { value: DayOfWeek; label: string; long: string }[] = [
  { value: 'MONDAY', label: 'MON', long: '월요일' },
  { value: 'TUESDAY', label: 'TUE', long: '화요일' },
  { value: 'WEDNESDAY', label: 'WED', long: '수요일' },
  { value: 'THURSDAY', label: 'THU', long: '목요일' },
  { value: 'FRIDAY', label: 'FRI', long: '금요일' },
  { value: 'SATURDAY', label: 'SAT', long: '토요일' },
  { value: 'SUNDAY', label: 'SUN', long: '일요일' },
]

export type Schedule = {
  id: number
  title: string
  startTime: string // "07:00:00"
  repeatDays: DayOfWeek[]
  startDate: string // "2026-10-12"
  endDate: string | null
}

export type BoardItem = {
  schedule: Schedule
  dueToday: boolean
  doneToday: boolean
  streak: number
  doneDates: string[]
}

export type Board = {
  today: string
  from: string // 보드 시작일(월요일)
  schedules: BoardItem[]
}

export type ScheduleInput = {
  title: string
  startTime: string
  repeatDays: DayOfWeek[]
  startDate?: string
  endDate?: string
}

export async function fetchBoard(signal?: AbortSignal): Promise<Board> {
  const response = await fetch('/api/schedules/board', { signal })
  if (!response.ok) {
    throw new Error(`일정을 불러오지 못했어요 (HTTP ${response.status})`)
  }
  return response.json()
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const response = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response, '일정을 추가하지 못했어요')
  }
  return response.json()
}

export async function updateSchedule(id: number, input: ScheduleInput): Promise<Schedule> {
  const response = await fetch(`/api/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response, '일정을 수정하지 못했어요')
  }
  return response.json()
}

export async function deleteSchedule(id: number): Promise<void> {
  const response = await fetch(`/api/schedules/${id}`, { method: 'DELETE', headers: csrfHeaders() })
  if (!response.ok) {
    throw await toApiError(response, '일정을 삭제하지 못했어요')
  }
}

// 완료 체크(done=true)·해제(false): 날짜 하나가 자원 하나 (PUT/DELETE)
export async function setDone(id: number, date: string, done: boolean): Promise<void> {
  const response = await fetch(`/api/schedules/${id}/records/${date}`, {
    method: done ? 'PUT' : 'DELETE',
    headers: csrfHeaders(),
  })
  if (!response.ok) {
    throw await toApiError(response, done ? '체크하지 못했어요' : '체크를 풀지 못했어요')
  }
}
