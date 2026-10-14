import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'

// 나란히 보기(원문 | 미리보기)가 들어가지 않는 폭: index.css의 .editor-panes 기준(60rem)과 같게
const NARROW_EDITOR = '(max-width: 59.99rem)'
const HOVER_OPEN_MS = 450 // 마우스를 이만큼 멈추면 팁 열기 (--dur-ui와 같은 값)
const TYPING_QUIET_MS = 1200 // 마지막 타이핑 뒤 이만큼은 팁을 열지 않음

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// 좁은 화면(창을 반으로 나눈 경우·휴대폰)의 미리보기 팁 (2026-10-15 소유자 요청, 글 편집기·뉴스 스크랩 화면 공용)
// 넓은 화면은 원문 | 미리보기 나란히. 좁으면 미리보기를 숨기고, 본문 칸 위에 마우스를 잠깐 멈추면 팁으로 띄움
// 타이핑하면 바로 닫힘(쓰는 글을 가리지 않도록), 마우스가 없는 기기는 하단 바 미리보기 버튼으로 열고 닫음
// 돌려주는 props를 본문 textarea(contentProps)·미리보기 section(previewProps)·미리보기 버튼(toggleProps)에 펼쳐 씀
export function usePreviewTip(contentRef: RefObject<HTMLTextAreaElement | null>) {
  const narrow = useMediaQuery(NARROW_EDITOR)
  const [preview, setPreview] = useState<'closed' | 'hover' | 'pinned'>('closed')
  const previewRef = useRef<HTMLElement>(null)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const lastTypedAt = useRef(0)
  const tipOpen = narrow && preview !== 'closed'

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  // 열릴 때: 보이는 화면 안(머리 위 ~ 하단 고정 바 위)에 맞춰 위치·높이를 정하고,
  // 본문 칸에서 보던 위치와 비슷한 곳을 보여 줌 (스크롤 비율을 맞춤)
  useLayoutEffect(() => {
    const tip = previewRef.current
    const textarea = contentRef.current
    const panes = tip?.parentElement
    if (!tipOpen || !tip || !textarea || !panes) return
    const gap = 12
    const footerTop = tip.closest('form')?.querySelector('.editor-footer')?.getBoundingClientRect().top ?? window.innerHeight
    const panesRect = panes.getBoundingClientRect()
    const top = Math.max(gap, gap - panesRect.top)
    const bottom = Math.min(panesRect.bottom, footerTop) - panesRect.top - gap
    tip.style.top = `${top}px`
    tip.style.maxHeight = `${Math.max(160, bottom - top)}px`
    const ratio = textarea.scrollTop / Math.max(1, textarea.scrollHeight - textarea.clientHeight)
    tip.scrollTop = ratio * (tip.scrollHeight - tip.clientHeight)
  }, [tipOpen, contentRef])

  // Esc로 닫기
  useEffect(() => {
    if (!tipOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview('closed')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tipOpen])

  // 마우스가 본문 칸 위에 잠깐 멈추면 열기 (지나가기만 하면 열지 않음, 방금 타이핑했으면 기다림)
  function handleContentPointerMove(event: PointerEvent<HTMLTextAreaElement>) {
    if (!narrow || event.pointerType !== 'mouse' || preview !== 'closed') return
    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => {
      if (Date.now() - lastTypedAt.current > TYPING_QUIET_MS) setPreview('hover')
    }, HOVER_OPEN_MS)
  }

  function closeHoverSoon() {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
    // 팁으로 마우스를 옮길 수 있게 조금 늦게 닫음 (Streak 팁과 같은 0.2초)
    closeTimer.current = window.setTimeout(() => setPreview((p) => (p === 'hover' ? 'closed' : p)), 200)
  }

  function handleTyping() {
    lastTypedAt.current = Date.now()
    window.clearTimeout(openTimer.current)
    if (preview === 'hover') setPreview('closed')
  }

  return {
    contentProps: {
      onKeyDown: handleTyping,
      onPointerMove: handleContentPointerMove,
      onPointerLeave: closeHoverSoon,
    },
    previewProps: {
      ref: previewRef,
      'data-open': narrow ? tipOpen : undefined,
      inert: narrow && !tipOpen,
      onPointerEnter: () => window.clearTimeout(closeTimer.current),
      onPointerLeave: () => {
        if (preview === 'hover') closeHoverSoon()
      },
      // 팁을 누르면 닫고 본문 칸으로 (넓은 화면의 나란히 보기에서는 아무 일 없음)
      onClick: () => {
        if (!narrow) return
        setPreview('closed')
        contentRef.current?.focus()
      },
    },
    toggleProps: {
      'aria-pressed': tipOpen,
      onClick: () => setPreview(tipOpen ? 'closed' : 'pinned'),
    },
  }
}
