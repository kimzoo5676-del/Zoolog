import { DAYS, type BoardItem } from '../api/schedule'
import { addDays, isDueOn, shortDate } from '../utils/scheduleDates'

type ScheduleGrassProps = {
  item: BoardItem
  from: string
  today: string
  weeks: number
  // 소유자만: 칸을 눌러 그날 완료 체크·해제
  onToggle?: (date: string, done: boolean) => void
}

type CellState = 'done' | 'missed' | 'pending' | 'off'

// 일정별 잔디 격자: 열 = 주(왼쪽이 오래된 주), 행 = 월~일
// 완료 = 진한 러스트 칸, 놓침 = 테두리만, 오늘 아직 = 점선, 쉬는 날·기간 밖 = 옅은 칸, 미래 = 비움
export function ScheduleGrass({ item, from, today, weeks, onToggle }: ScheduleGrassProps) {
  const done = new Set(item.doneDates)
  const dueDays = Array.from({ length: weeks * 7 }, (_, i) => addDays(from, i)).filter(
    (date) => date <= today && isDueOn(item.schedule, date),
  )
  const doneCount = dueDays.filter((date) => done.has(date)).length

  function stateOf(date: string): CellState {
    if (!isDueOn(item.schedule, date)) return 'off'
    if (done.has(date)) return 'done'
    return date === today ? 'pending' : 'missed'
  }

  return (
    <div className="grass">
      {/* 요일 라벨: 월·수·금만 (GitHub 잔디처럼 줄여서) */}
      <div className="grass-days" aria-hidden="true">
        {DAYS.map((day, i) => (
          <span key={day.value}>{i % 2 === 0 ? day.label : ''}</span>
        ))}
      </div>
      <div
        className="grass-grid"
        style={{ gridTemplateColumns: `repeat(${weeks}, var(--grass-cell))` }}
        role={onToggle ? 'group' : 'img'}
        aria-label={`최근 ${weeks}주, 해야 했던 ${dueDays.length}일 중 ${doneCount}일 완료`}
      >
        {Array.from({ length: weeks }, (_, week) =>
          DAYS.map((_, row) => {
            const date = addDays(from, week * 7 + row)
            const key = date
            // 미래 칸은 자리만 차지 (격자 모양 유지)
            if (date > today) return <span key={key} className="grass-cell is-future" style={{ gridColumn: week + 1, gridRow: row + 1 }} />
            const state = stateOf(date)
            const style = { gridColumn: week + 1, gridRow: row + 1 }
            const label = `${shortDate(date)} ${state === 'done' ? '완료' : state === 'off' ? '일정 없음' : '미완료'}`
            if (onToggle && state !== 'off') {
              return (
                <button
                  key={key}
                  type="button"
                  className={`grass-cell is-${state}`}
                  style={style}
                  aria-label={label}
                  aria-pressed={state === 'done'}
                  title={label}
                  onClick={() => onToggle(date, state !== 'done')}
                />
              )
            }
            return <span key={key} className={`grass-cell is-${state}`} style={style} title={label} />
          }),
        )}
      </div>
    </div>
  )
}
