import { useState } from 'react'
import { useRevalidator } from 'react-router'
import { deleteSchedule, fetchBoard, setDone, type BoardItem } from '../api/schedule'
import { PageHeader } from '../components/PageHeader'
import { RouteError } from '../components/RouteError'
import { ScheduleForm } from '../components/ScheduleForm'
import { ScheduleGrass } from '../components/ScheduleGrass'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { errorMessage } from '../utils/postForm'
import { repeatLabel, shortDate } from '../utils/scheduleDates'
import type { Route } from './+types/schedules'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { board: await fetchBoard(request.signal) }
}

const WEEKS = 12 // 백엔드 board 기본값과 같게

// 일정 보드 (2026-10-12 결정: 방문자도 보기, 등록·체크는 소유자)
// 오늘 칸(오늘 할 일정, 시각순, 체크) → 일정마다 최근 12주 잔디 + 연속 일수
export default function Schedules({ loaderData }: Route.ComponentProps) {
  const { board } = loaderData
  const { me } = useBlogLayoutData()
  const { revalidate } = useRevalidator()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 체크 즉시 화면에 반영(낙관적 업데이트), 서버 응답 뒤 다시 불러와 맞춤
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const todayItems = board.schedules.filter((item) => item.dueToday)

  function isDone(item: BoardItem, date: string) {
    const key = `${item.schedule.id}:${date}`
    return key in pending ? pending[key] : item.doneDates.includes(date)
  }

  // 낙관적 반영으로 바뀐 완료 날짜를 보드 항목에 덮어씀
  function withPending(item: BoardItem): BoardItem {
    const dates = new Set(item.doneDates)
    for (const [key, done] of Object.entries(pending)) {
      const [id, date] = key.split(':')
      if (Number(id) !== item.schedule.id) continue
      if (done) dates.add(date)
      else dates.delete(date)
    }
    return { ...item, doneDates: [...dates], doneToday: dates.has(board.today) }
  }

  async function toggle(item: BoardItem, date: string, done: boolean) {
    const key = `${item.schedule.id}:${date}`
    setError(null)
    setPending((current) => ({ ...current, [key]: done }))
    try {
      await setDone(item.schedule.id, date, done)
      await revalidate()
    } catch (e) {
      setError(errorMessage(e, '체크하지 못했어요'))
    } finally {
      setPending((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  async function remove(item: BoardItem) {
    if (!window.confirm(`"${item.schedule.title}" 일정을 삭제할까요? 완료 기록도 함께 지워져요.`)) return
    try {
      await deleteSchedule(item.schedule.id)
      await revalidate()
    } catch (e) {
      setError(errorMessage(e, '일정을 삭제하지 못했어요'))
    }
  }

  return (
    <>
      <title>일정 | zoolog</title>
      <PageHeader eyebrow="Schedule" title="일정" />

      <section className="today" aria-labelledby="today-title">
        <h2 id="today-title" className="today-title">
          <span className="picker-label">Today</span> {shortDate(board.today)}
        </h2>
        {todayItems.length === 0 ? (
          <p className="today-empty">오늘은 일정이 없어요.</p>
        ) : (
          <ul className="today-list">
            {todayItems.map((item) => {
              const done = isDone(item, board.today)
              return (
                <li key={item.schedule.id} className={done ? 'today-row is-done' : 'today-row'}>
                  {me ? (
                    <button
                      type="button"
                      className="today-check"
                      aria-pressed={done}
                      aria-label={`${item.schedule.title} ${done ? '완료 취소' : '완료'}`}
                      onClick={() => void toggle(item, board.today, !done)}
                    >
                      <span aria-hidden="true">{done ? '✓' : ''}</span>
                    </button>
                  ) : (
                    <span className="today-check" aria-label={done ? '완료' : '미완료'} role="img">
                      <span aria-hidden="true">{done ? '✓' : ''}</span>
                    </span>
                  )}
                  <time className="today-time">{item.schedule.startTime.slice(0, 5)}</time>
                  <span className="today-name">{item.schedule.title}</span>
                </li>
              )
            })}
          </ul>
        )}
        {error && (
          <p className="form-error today-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <ul className="schedule-list">
        {board.schedules.map((raw) => {
          const item = withPending(raw)
          return (
            <li key={item.schedule.id} className="schedule-row">
              <div className="schedule-head">
                <h3 className="schedule-name">
                  <time>{item.schedule.startTime.slice(0, 5)}</time> {item.schedule.title}
                </h3>
                <p className="schedule-meta">
                  <span>{repeatLabel(item.schedule.repeatDays)}</span>
                  <span>
                    연속 <strong>{item.streak}</strong>일
                  </span>
                  {me && (
                    <button type="button" className="text-link" onClick={() => void remove(item)}>
                      삭제
                    </button>
                  )}
                </p>
              </div>
              <ScheduleGrass
                item={item}
                from={board.from}
                today={board.today}
                weeks={WEEKS}
                onToggle={me ? (date, done) => void toggle(raw, date, done) : undefined}
              />
            </li>
          )
        })}
      </ul>

      {board.schedules.length > 0 && (
        <p className="grass-legend" aria-hidden="true">
          <span className="grass-cell is-done" /> 완료 <span className="grass-cell is-missed" /> 놓침
          <span className="grass-cell is-pending" /> 오늘 <span className="grass-cell is-off" /> 쉬는 날
        </p>
      )}

      {me && (
        <div className="schedule-add">
          {adding ? (
            <ScheduleForm
              today={board.today}
              onCancel={() => setAdding(false)}
              onCreated={async () => {
                await revalidate()
                setAdding(false)
              }}
            />
          ) : (
            <button type="button" className="chip chip-add schedule-add-button" onClick={() => setAdding(true)}>
              + 일정
            </button>
          )}
        </div>
      )}
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
