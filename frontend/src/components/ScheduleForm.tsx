import { useState, type FormEvent } from 'react'
import { createSchedule, DAYS, type DayOfWeek } from '../api/schedule'
import { errorMessage } from '../utils/postForm'

type ScheduleFormProps = {
  today: string
  onCreated: () => Promise<void>
  onCancel: () => void
}

// 일정 추가 칸 (소유자): 제목, 시각, 반복 요일(칩), 시작일
export function ScheduleForm({ today, onCreated, onCancel }: ScheduleFormProps) {
  const [days, setDays] = useState<DayOfWeek[]>(DAYS.map((d) => d.value))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function toggleDay(day: DayOfWeek) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (days.length === 0) {
      setError('반복할 요일을 하나 이상 골라 주세요')
      return
    }
    setPending(true)
    setError(null)
    try {
      await createSchedule({
        title: String(form.get('title') ?? '').trim(),
        startTime: String(form.get('startTime')),
        repeatDays: days,
        startDate: String(form.get('startDate') || today),
      })
      await onCreated()
    } catch (e) {
      setError(errorMessage(e, '일정을 추가하지 못했어요'))
      setPending(false)
    }
  }

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label className="schedule-field schedule-field-title">
        <span className="picker-label">Title</span>
        <input name="title" required maxLength={100} placeholder="예: AWS-SAA 공부" autoFocus />
      </label>
      <label className="schedule-field">
        <span className="picker-label">Time</span>
        <input name="startTime" type="time" required defaultValue="07:00" />
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
        <input name="startDate" type="date" defaultValue={today} />
      </label>
      <div className="schedule-form-actions">
        <button type="button" className="button-link" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="button-solid" disabled={pending}>
          추가
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
