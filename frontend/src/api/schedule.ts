import { csrfHeaders } from './auth'
import { toApiError } from './error'

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: '월' },
  { value: 'TUESDAY', label: '화' },
  { value: 'WEDNESDAY', label: '수' },
  { value: 'THURSDAY', label: '목' },
  { value: 'FRIDAY', label: '금' },
  { value: 'SATURDAY', label: '토' },
  { value: 'SUNDAY', label: '일' },
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
