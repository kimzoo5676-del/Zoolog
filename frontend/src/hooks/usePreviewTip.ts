import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// 나란히 보기(원문 | 미리보기)가 들어가지 않는 폭: index.css의 .editor-panes 기준(60rem)과 같게
const NARROW_EDITOR = '(max-width: 59.99rem)'

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
// 넓은 화면은 원문 | 미리보기 나란히. 좁으면 미리보기를 숨기고 하단 바 미리보기 버튼으로만 열고 닫음
// (마우스를 올리면 뜨던 방식은 2026-10-16 소유자 결정으로 제외: 쓰는 중에 의도치 않게 떠서)
// Esc·팁 누름(본문 칸으로 돌아감)으로도 닫힘. 돌려주는 props를 미리보기 section(previewProps)·버튼(toggleProps)에 펼쳐 씀
export function usePreviewTip(contentRef: RefObject<HTMLTextAreaElement | null>) {
  const narrow = useMediaQuery(NARROW_EDITOR)
  const [open, setOpen] = useState(false)
  const previewRef = useRef<HTMLElement>(null)
  const tipOpen = narrow && open

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
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tipOpen])

  return {
    previewProps: {
      ref: previewRef,
      'data-open': narrow ? tipOpen : undefined,
      inert: narrow && !tipOpen,
      // 팁을 누르면 닫고 본문 칸으로 (넓은 화면의 나란히 보기에서는 아무 일 없음)
      onClick: () => {
        if (!narrow) return
        setOpen(false)
        contentRef.current?.focus()
      },
    },
    toggleProps: {
      'aria-pressed': tipOpen,
      onClick: () => setOpen(!tipOpen),
    },
  }
}
