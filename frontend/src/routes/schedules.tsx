import { useState } from 'react'
import { useRevalidator } from 'react-router'
import { DAYS, deleteSchedule, fetchBoard, setDone, type BoardItem } from '../api/schedule'
import { HabitCard } from '../components/HabitCard'
import { ProgressRing } from '../components/ProgressRing'
import { RouteError } from '../components/RouteError'
import { ScheduleForm } from '../components/ScheduleForm'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { errorMessage } from '../utils/postForm'
import { addDays, dayOfWeek, isDueOn, repeatLabel } from '../utils/scheduleDates'
import type { Route } from './+types/schedules'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { board: await fetchBoard(request.signal) }
}

// 일정 보드 (2026-10-12 결정: 방문자도 보기, 등록·체크는 소유자)
// 참고: Things 3 Today(하루 일정 한 목록), Apple 피트니스(날짜별 달성 링, 위쪽 주간 줄로 날짜 이동)
// 구성: 날짜 머리 칸(큰 날짜 + 달성 링) → 주간 줄(월~일, 칸마다 링) → 고른 날 목록(둥근 체크) → 습관 카드 격자
export default function Schedules({ loaderData }: Route.ComponentProps) {
  const { board } = loaderData
  const { me } = useBlogLayoutData()
  const { revalidate } = useRevalidator()
  const [selected, setSelected] = useState(board.today)
  const [adding, setAdding] = useState(false)
  // 수정 중인 일정 id: 그 카드 자리에서 입력 칸으로 바뀜
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 체크 즉시 화면에 반영(낙관적 업데이트), 서버 응답 뒤 다시 불러와 맞춤
  const [pending, setPending] = useState<Record<string, boolean>>({})

  // 낙관적 반영으로 바뀐 완료 날짜를 덮어쓴 보드 항목
  const items: BoardItem[] = board.schedules.map((item) => {
    const dates = new Set(item.doneDates)
    for (const [key, done] of Object.entries(pending)) {
      const [id, date] = key.split(':')
      if (Number(id) !== item.schedule.id) continue
      if (done) dates.add(date)
      else dates.delete(date)
    }
    return { ...item, doneDates: [...dates] }
  })

  const dayStats = (date: string) => {
    const due = items.filter((item) => isDueOn(item.schedule, date))
    return { due, done: due.filter((item) => item.doneDates.includes(date)).length }
  }

  // 이번 주 월요일부터 일요일
  const monday = addDays(board.today, -DAYS.findIndex((d) => d.value === dayOfWeek(board.today)))
  const week = DAYS.map((d, i) => ({ ...d, date: addDays(monday, i) }))
  const selectedStats = dayStats(selected)
  const [, month, day] = selected.split('-')
  const weekdayIndex = DAYS.findIndex((d) => d.value === dayOfWeek(selected))

  async function toggle(id: number, date: string, done: boolean) {
    const key = `${id}:${date}`
    setError(null)
    setPending((current) => ({ ...current, [key]: done }))
    try {
      await setDone(id, date, done)
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
      <h1 className="visually-hidden">일정</h1>

      {/* 날짜 머리 칸: 아주 큰 날짜(포스터형) + 그날 달성 링 */}
      <section className="day-hero" aria-label="고른 날 요약">
        <div>
          <p className="picker-label">{selected === board.today ? 'Today' : 'Day'}</p>
          <p className="day-hero-date">
            {Number(month)}.{Number(day)}
          </p>
          <p className="day-hero-weekday">{DAYS[weekdayIndex].long}</p>
        </div>
        <div className="day-hero-ring">
          <ProgressRing done={selectedStats.done} total={selectedStats.due.length} size={148} stroke={14} />
          <p className="day-hero-count">
            <strong>{selectedStats.done}</strong>
            <span>/ {selectedStats.due.length}</span>
          </p>
        </div>
      </section>

      {/* 주간 줄: 날짜를 고르면 그날 목록으로 (미래 날짜는 고를 수 없음) */}
      <nav className="week-strip" aria-label="이번 주">
        {week.map(({ label, long, date }) => {
          const stats = dayStats(date)
          const future = date > board.today
          return (
            <button
              key={date}
              type="button"
              className="week-day"
              aria-pressed={date === selected}
              aria-label={`${long} ${Number(date.slice(8))}일, ${stats.due.length}개 중 ${stats.done}개 완료`}
              disabled={future}
              onClick={() => setSelected(date)}
            >
              {/* 요일 약어를 크게, 날짜는 그 아래 작게, 달성 링은 맨 아래 */}
              <span className="week-day-label">{label}</span>
              <span className="week-day-number">{Number(date.slice(8))}</span>
              <ProgressRing className="week-day-ring" done={stats.done} total={stats.due.length} size={36} stroke={4} />
            </button>
          )
        })}
      </nav>

      {/* 고른 날 목록: 시각순, 오른쪽 둥근 체크 (Apple 미리 알림 방식) */}
      <section className="agenda" aria-label="고른 날 일정">
        {selectedStats.due.length === 0 ? (
          <p className="agenda-empty">이날은 일정이 없어요.</p>
        ) : (
          <ul className="agenda-list">
            {selectedStats.due.map((item) => {
              const done = item.doneDates.includes(selected)
              return (
                <li key={item.schedule.id} className={done ? 'agenda-row is-done' : 'agenda-row'}>
                  <time className="agenda-time">{item.schedule.startTime.slice(0, 5)}</time>
                  <div className="agenda-main">
                    <span className="agenda-title">{item.schedule.title}</span>
                    <span className="agenda-meta">
                      {repeatLabel(item.schedule.repeatDays)} · {item.streak}일 연속
                    </span>
                  </div>
                  {me ? (
                    <button
                      type="button"
                      className="agenda-check"
                      aria-pressed={done}
                      aria-label={`${item.schedule.title} ${done ? '완료 취소' : '완료'}`}
                      onClick={() => void toggle(item.schedule.id, selected, !done)}
                    >
                      <span aria-hidden="true">✓</span>
                    </button>
                  ) : (
                    <span className="agenda-check" role="img" aria-label={done ? '완료' : '미완료'}>
                      <span aria-hidden="true">✓</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {error && (
          <p className="form-error agenda-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* 습관 카드 격자 */}
      {items.length > 0 && (
        <section className="habits" aria-labelledby="habits-title">
          <h2 id="habits-title" className="habits-title">
            Habits
          </h2>
          <div className="habit-grid">
            {items.map((item) =>
              me && editingId === item.schedule.id ? (
                <div key={item.schedule.id} className="habit-card is-editing">
                  <ScheduleForm
                    className="schedule-form-inline"
                    today={board.today}
                    schedule={item.schedule}
                    onCancel={() => setEditingId(null)}
                    onSaved={async () => {
                      await revalidate()
                      setEditingId(null)
                    }}
                  />
                </div>
              ) : (
                <HabitCard
                  key={item.schedule.id}
                  item={item}
                  today={board.today}
                  onToggle={me ? (date, done) => void toggle(item.schedule.id, date, done) : undefined}
                  onEdit={me ? () => setEditingId(item.schedule.id) : undefined}
                  onDelete={me ? () => void remove(item) : undefined}
                />
              ),
            )}
          </div>
        </section>
      )}

      {me && (
        <div className="schedule-add">
          {adding ? (
            <ScheduleForm
              today={board.today}
              onCancel={() => setAdding(false)}
              onSaved={async () => {
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
