import { useCallback, useEffect, useRef, useState } from 'react'

// 글 임시 저장 (2026-10-16 소유자 요청: 쓰는 도중 로그인이 풀려 다시 쓴 일)
// 1분마다, 그리고 탭을 숨기거나 닫을 때·게시 버튼을 누를 때 브라우저(localStorage)에 저장
// 로그인이 풀린 상태에서도 저장되고 다시 로그인해도 남아 있음. 서버에 보내지 않으므로 이 브라우저에서만 보임
// 게시·저장에 성공하면 라우트 clientAction이 clearDraft로 지움
const AUTOSAVE_MS = 60_000

type Draft<T> = { values: T; savedAt: number }

export function draftKey(...parts: (string | number)[]) {
  return ['zoolog:draft', ...parts].join(':')
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)은 무시
  }
}

function readDraft<T>(key: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Draft<T>) : null
  } catch {
    return null
  }
}

// values: 지금 편집 중인 값, initial: 화면을 열 때의 값(새 글은 빈 값, 수정은 원래 글)
// pending: 불러올 수 있는 임시 저장본(지금 값과 다를 때만), savedAt: 마지막으로 자동 저장한 시각
export function useDraftAutosave<T extends Record<string, string>>(key: string, values: T, initial: T) {
  const initialJson = JSON.stringify(initial)
  const [pending, setPending] = useState<Draft<T> | null>(() => {
    const draft = readDraft<T>(key)
    return draft && JSON.stringify(draft.values) !== initialJson ? draft : null
  })
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // 타이머·이벤트에서 읽을 최신 값 (렌더링이 끝난 뒤 갱신)
  const latest = useRef({ key, values, initialJson, pending })
  const lastSavedRef = useRef<string | null>(null)
  useEffect(() => {
    latest.current = { key, values, initialJson, pending }
  })

  // 저장: 연 뒤로 바뀐 것이 있고, 마지막 저장과 다를 때만 (불러올 임시 저장본을 고르기 전에는 덮어쓰지 않음)
  const save = useCallback(() => {
    const { key, values, initialJson, pending } = latest.current
    const json = JSON.stringify(values)
    if (pending || json === initialJson || json === lastSavedRef.current) return
    const now = Date.now()
    try {
      localStorage.setItem(key, JSON.stringify({ values, savedAt: now }))
      lastSavedRef.current = json
      setSavedAt(now)
    } catch {
      // 저장 공간이 꽉 찼거나 막힌 경우: 화면의 글은 그대로이므로 조용히 넘어감
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(save, AUTOSAVE_MS)
    const onHide = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [save])

  return {
    pending,
    savedAt,
    // 게시 직전에도 저장: 로그인이 풀려 실패해도 다시 로그인한 뒤 불러올 수 있게
    saveNow: save,
    // 불러오기: 호출한 쪽이 pending.values를 화면 값에 넣은 뒤 부름
    acceptPending: () => setPending(null),
    discardPending: () => {
      clearDraft(key)
      setPending(null)
    },
  }
}
