import { redirect } from 'react-router'

// 예전 일정 화면 주소 → Streak (2026-10-13 일정 화면 삭제)
export function clientLoader() {
  return redirect('/streak')
}

export default function SchedulesRedirect() {
  return null
}
