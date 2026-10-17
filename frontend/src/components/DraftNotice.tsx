// 임시 저장본 안내 줄 (useDraftAutosave): 화면을 열 때 이 브라우저에 저장된 글이 있으면 불러오기 · 지우기
export function DraftNotice({ savedAt, onRestore, onDiscard }: { savedAt: number; onRestore: () => void; onDiscard: () => void }) {
  return (
    <div className="draft-notice" role="status">
      <span>
        임시 저장된 글이 있어요 <time dateTime={new Date(savedAt).toISOString()}>{formatSavedAt(savedAt)}</time>
      </span>
      <button type="button" className="button-link" onClick={onRestore}>
        불러오기
      </button>
      <button type="button" className="button-link" onClick={onDiscard}>
        지우기
      </button>
    </div>
  )
}

// 하단 바의 마지막 자동 저장 시각
export function AutosaveStatus({ savedAt }: { savedAt: number | null }) {
  if (!savedAt) return null
  return (
    <span className="autosave-status" aria-live="polite">
      자동 저장 <time dateTime={new Date(savedAt).toISOString()}>{formatSavedAt(savedAt)}</time>
    </span>
  )
}

// 10월 17일 07:22
function formatSavedAt(time: number) {
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
