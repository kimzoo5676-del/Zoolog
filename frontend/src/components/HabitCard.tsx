import { DAYS, type BoardItem } from '../api/schedule'
import { addDays, dayOfWeek, isDueOn, repeatLabel, shortDate } from '../utils/scheduleDates'

type HabitCardProps = {
  item: BoardItem
  today: string
  onToggle?: (date: string, done: boolean) => void
  onDelete?: () => void
}

const CALENDAR_WEEKS = 5

// 습관 카드: 연속 일수(큰 숫자) + 최근 30일 달성률 + 최근 5주 달력(월~일 7열, 칸이 카드 폭을 채움)
// 놓친 날은 옅게 (습관 앱 권장: 놓친 날을 벌주듯 강하게 표시하지 않음)
export function HabitCard({ item, today, onToggle, onDelete }: HabitCardProps) {
  const done = new Set(item.doneDates)
  const { schedule } = item

  // 최근 30일 중 해야 했던 날, 완료한 날
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, -i)).filter((d) => isDueOn(schedule, d))
  const rate = last30.length === 0 ? 0 : Math.round((last30.filter((d) => done.has(d)).length / last30.length) * 100)

  // 달력 시작: 이번 주 월요일에서 4주 전 월요일
  const mondayIndex = DAYS.findIndex((d) => d.value === dayOfWeek(today))
  const start = addDays(today, -mondayIndex - (CALENDAR_WEEKS - 1) * 7)

  return (
    <article className="habit-card">
      <header className="habit-head">
        <h3 className="habit-title">{schedule.title}</h3>
        <p className="habit-meta">
          <time>{schedule.startTime.slice(0, 5)}</time> · {repeatLabel(schedule.repeatDays)}
        </p>
      </header>
      <div className="habit-numbers">
        <p className="habit-streak">
          <strong>{item.streak}</strong>
          <span>일 연속</span>
        </p>
        <p className="habit-rate">
          <strong>{rate}%</strong>
          <span>최근 30일</span>
        </p>
      </div>
      <div className="habit-calendar" role={onToggle ? 'group' : 'img'} aria-label={`최근 30일 달성률 ${rate}%`}>
        {DAYS.map((d) => (
          <span key={d.value} className="habit-weekday" aria-hidden="true">
            {d.label}
          </span>
        ))}
        {Array.from({ length: CALENDAR_WEEKS * 7 }, (_, i) => {
          const date = addDays(start, i)
          if (date > today) return <span key={date} className="habit-day is-future" />
          const due = isDueOn(schedule, date)
          const state = !due ? 'off' : done.has(date) ? 'done' : date === today ? 'pending' : 'missed'
          const label = `${shortDate(date)} ${state === 'done' ? '완료' : state === 'off' ? '일정 없음' : '미완료'}`
          const content = <span className="habit-day-number">{Number(date.slice(8))}</span>
          return onToggle && due ? (
            <button
              key={date}
              type="button"
              className={`habit-day is-${state}`}
              aria-label={label}
              aria-pressed={state === 'done'}
              onClick={() => onToggle(date, state !== 'done')}
            >
              {content}
            </button>
          ) : (
            <span key={date} className={`habit-day is-${state}`} title={label}>
              {content}
            </span>
          )
        })}
      </div>
      {onDelete && (
        <button type="button" className="text-link habit-delete" onClick={onDelete}>
          삭제
        </button>
      )}
    </article>
  )
}
