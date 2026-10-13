import { useId, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { createSchedule, DAYS, updateSchedule, type DayOfWeek, type Schedule } from '../api/schedule'
import { errorMessage } from '../utils/postForm'
import { parseSchedule } from '../utils/scheduleParse'
import { dotDate, repeatLabel } from '../utils/scheduleDates'

type ScheduleFormProps = {
  today: string
  // 있으면 수정, 없으면 추가
  schedule?: Schedule
  onSaved: () => Promise<void>
  onCancel: () => void
  className?: string
}

type RepeatMode = 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM'

const ALL = DAYS.map((d) => d.value)
const PRESETS: { mode: Exclude<RepeatMode, 'CUSTOM'>; days: DayOfWeek[] }[] = [
  { mode: 'DAILY', days: ALL },
  { mode: 'WEEKDAYS', days: ALL.slice(0, 5) },
  { mode: 'WEEKENDS', days: ALL.slice(5) },
]

function modeOf(days: DayOfWeek[]): RepeatMode {
  const preset = PRESETS.find((p) => p.days.length === days.length && p.days.every((d) => days.includes(d)))
  return preset?.mode ?? 'CUSTOM'
}

// 일정 추가·수정 (소유자 전용, 방문자에게는 그려지지 않음)
// 조사한 일정 앱의 공통 방식 반영 (2026-10-13):
// - 제목 한 줄에 "매일 7시"처럼 적으면 알아듣고 밑줄로 표시 (Todoist Quick Add, Things 날짜 입력)
// - 반복은 자주 쓰는 묶음(매일·평일·주말)을 먼저, 요일 고르기는 직접 선택에서만 (Apple 미리 알림 반복)
// - 시작일·끝나는 날은 기본값(오늘부터, 계속)으로 접어 두고 필요할 때만 펼침
// - 고른 내용을 한 문장 요약으로 계속 보여 줌. Enter 저장, Esc 닫기
export function ScheduleForm({ today, schedule, onSaved, onCancel, className }: ScheduleFormProps) {
  const editing = schedule !== undefined
  const [text, setText] = useState(schedule?.title ?? '')
  // 직접 고른 값이 있으면 제목에서 알아들은 값보다 우선
  const [pickedDays, setPickedDays] = useState<DayOfWeek[] | null>(schedule?.repeatDays ?? null)
  const [pickedTime, setPickedTime] = useState<string | null>(schedule?.startTime.slice(0, 5) ?? null)
  const [customOpen, setCustomOpen] = useState(schedule ? modeOf(schedule.repeatDays) === 'CUSTOM' : false)
  const [periodOpen, setPeriodOpen] = useState(Boolean(schedule?.endDate))
  const [startDate, setStartDate] = useState(schedule?.startDate ?? today)
  const [endDate, setEndDate] = useState(schedule?.endDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const summaryId = useId()

  const parsed = parseSchedule(text)
  const days = pickedDays ?? parsed.days ?? ALL
  const time = pickedTime ?? parsed.time ?? '07:00'
  const mode = customOpen ? 'CUSTOM' : modeOf(days)

  function pickPreset(next: RepeatMode) {
    if (next === 'CUSTOM') {
      setCustomOpen(true)
      setPickedDays(days)
      return
    }
    setCustomOpen(false)
    setPickedDays(PRESETS.find((p) => p.mode === next)!.days)
  }

  function toggleDay(day: DayOfWeek) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    setPickedDays(ALL.filter((d) => next.includes(d)))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  // 제목 칸은 여러 줄로 늘어나는 textarea라 Enter를 저장으로 사용
  function handleTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = parsed.title
    if (!title) {
      setError('제목을 입력해 주세요')
      return
    }
    if (days.length === 0) {
      setError('반복할 요일을 하나 이상 골라 주세요')
      return
    }
    const input = { title, startTime: time, repeatDays: days, startDate, endDate: endDate || undefined }
    setPending(true)
    setError(null)
    try {
      if (editing) await updateSchedule(schedule.id, input)
      else await createSchedule(input)
      await onSaved()
    } catch (e) {
      setError(errorMessage(e, editing ? '일정을 수정하지 못했어요' : '일정을 추가하지 못했어요'))
      setPending(false)
    }
  }

  // 알아들은 부분에 밑줄 (입력 칸 뒤에 같은 글자를 투명하게 깔고 그 부분만 표시)
  const segments: { text: string; mark: boolean }[] = []
  let cursor = 0
  for (const { start, end } of parsed.matches) {
    segments.push({ text: text.slice(cursor, start), mark: false }, { text: text.slice(start, end), mark: true })
    cursor = end
  }
  segments.push({ text: text.slice(cursor), mark: false })

  const summary = [
    repeatLabel(days) || 'NO DAYS',
    time,
    startDate === today ? 'from TODAY' : `from ${dotDate(startDate)}`,
    endDate ? `until ${dotDate(endDate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <form
      className={className ? `schedule-composer ${className}` : 'schedule-composer'}
      aria-label={editing ? `${schedule.title} 일정 수정` : '일정 추가'}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className="composer-title">
        <div className="composer-title-mirror" aria-hidden="true">
          {segments.map((s, i) => (s.mark ? <mark key={i}>{s.text}</mark> : s.text))}{' '}
        </div>
        <textarea
          name="title"
          rows={1}
          maxLength={100}
          value={text}
          placeholder="AWS-SAA 공부 매일 7시"
          aria-label="제목 (반복·시각을 함께 적으면 알아들음)"
          aria-describedby={summaryId}
          autoFocus
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={handleTitleKeyDown}
        />
      </div>

      <p id={summaryId} className="composer-summary" aria-live="polite">
        {summary}
      </p>

      <div className="composer-row">
        <span className="picker-label">Repeat</span>
        <div
          className="composer-segments"
          role="radiogroup"
          aria-label="반복"
          style={{ '--count': 4 } as CSSProperties}
        >
          {(['DAILY', 'WEEKDAYS', 'WEEKENDS', 'CUSTOM'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className="composer-segment"
              onClick={() => pickPreset(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'CUSTOM' && (
        <div className="composer-row composer-days" role="group" aria-label="요일">
          <span className="picker-label" aria-hidden="true" />
          <div className="composer-segments" style={{ '--count': 7 } as CSSProperties}>
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={days.includes(d.value)}
                aria-label={d.long}
                className="composer-segment"
                onClick={() => toggleDay(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="composer-row">
        <span className="picker-label">Time</span>
        <input
          className="composer-time"
          type="time"
          required
          value={time}
          onChange={(e) => setPickedTime(e.target.value)}
        />
      </label>

      {periodOpen ? (
        <div className="composer-row composer-period">
          <span className="picker-label">Period</span>
          <div className="composer-period-fields">
            <label>
              <span className="visually-hidden">시작일</span>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <span aria-hidden="true">→</span>
            <label>
              <span className="visually-hidden">끝나는 날 (비우면 계속)</span>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
        </div>
      ) : (
        <div className="composer-row">
          <span className="picker-label">Period</span>
          <button type="button" className="text-link" onClick={() => setPeriodOpen(true)}>
            기간 정하기
          </button>
        </div>
      )}

      <div className="composer-footer">
        <span className="composer-keys" aria-hidden="true">
          <kbd>Enter</kbd> {editing ? '저장' : '추가'} <kbd>Esc</kbd> 닫기
        </span>
        <button type="button" className="button-link" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="button-solid" disabled={pending}>
          {editing ? '저장' : '추가'}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
