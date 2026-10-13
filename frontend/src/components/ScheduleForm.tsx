import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createSchedule, DAYS, updateSchedule, type DayOfWeek, type Schedule } from '../api/schedule'
import { errorMessage } from '../utils/postForm'

type ScheduleFormProps = {
  today: string
  // 있으면 수정, 없으면 추가
  schedule?: Schedule
  onSaved: () => Promise<void>
  onCancel: () => void
  className?: string
}

// 일정 추가·수정 칸 (소유자): 제목, 시각, 반복 요일(칩), 시작일, 끝나는 날(비우면 계속). Esc로 닫기
export function ScheduleForm({ today, schedule, onSaved, onCancel, className }: ScheduleFormProps) {
  const [days, setDays] = useState<DayOfWeek[]>(schedule?.repeatDays ?? DAYS.map((d) => d.value))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const editing = schedule !== undefined
  const hintId = useId()

  function toggleDay(day: DayOfWeek) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (days.length === 0) {
      setError('반복할 요일을 하나 이상 골라 주세요')
      return
    }
    const input = {
      title: String(form.get('title') ?? '').trim(),
      startTime: String(form.get('startTime')),
      repeatDays: days,
      startDate: String(form.get('startDate') || (schedule?.startDate ?? today)),
      endDate: String(form.get('endDate') ?? '') || undefined,
    }
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

  return (
    <form
      className={className ? `schedule-form ${className}` : 'schedule-form'}
      aria-label={editing ? `${schedule.title} 일정 수정` : '일정 추가'}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <label className="schedule-field schedule-field-title">
        <span className="picker-label">Title</span>
        <input
          name="title"
          required
          maxLength={100}
          placeholder="예: AWS-SAA 공부"
          defaultValue={schedule?.title}
          autoFocus
        />
      </label>
      <label className="schedule-field">
        <span className="picker-label">Time</span>
        <input name="startTime" type="time" required defaultValue={schedule?.startTime.slice(0, 5) ?? '07:00'} />
      </label>
      <fieldset className="schedule-field schedule-days">
        <legend className="picker-label">Repeat</legend>
        <div className="picker-options">
          {DAYS.map((day) => (
            <label key={day.value} className="chip">
              <input type="checkbox" checked={days.includes(day.value)} onChange={() => toggleDay(day.value)} />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="schedule-field">
        <span className="picker-label">Start</span>
        <input name="startDate" type="date" defaultValue={schedule?.startDate ?? today} />
      </label>
      <label className="schedule-field">
        <span className="picker-label">End</span>
        <input name="endDate" type="date" defaultValue={schedule?.endDate ?? ''} aria-describedby={hintId} />
      </label>
      <p id={hintId} className="schedule-hint">
        끝나는 날을 비우면 계속 반복
      </p>
      <div className="schedule-form-actions">
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
