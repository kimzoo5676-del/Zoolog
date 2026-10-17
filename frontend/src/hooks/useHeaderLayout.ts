import { useLayoutEffect, type RefObject } from 'react'
import { updateScrollEdges, watchScrollEdges } from './scrollEdges'

// 머리글 배치 (2026-10-15 소유자 요청: 반으로 나눈 창·휴대폰에서 메뉴가 줄을 넘기며 격자선이 어긋나던 문제)
// 한 줄에 다 들어가면 로고 칸 | 메뉴 칸 한 줄, 안 들어가면 is-stacked: 로고 줄 + 메뉴 줄 두 줄
// 화면 폭 고정값(media query) 대신 실제로 넘치는지를 잼: 주제 수·이름 길이·로그인 여부(글쓰기 칸)가 바뀌어도 맞음
// 메뉴 줄에도 다 안 들어가면(휴대폰) 줄을 넘기지 않고 옆으로 밀어서 봄: 가려진 쪽 끝을 흐리게(can-scroll-*)
export function useHeaderLayout(headerRef: RefObject<HTMLElement | null>, activeKey: string, layoutKey: string) {
  useLayoutEffect(() => {
    const header = headerRef.current
    const brand = header?.querySelector<HTMLElement>('.site-brand')
    const nav = header?.querySelector<HTMLElement>('.site-nav')
    if (!header || !brand || !nav) return

    // 한 줄 배치로 놓아 보고 메뉴가 다음 줄로 넘어가면 두 줄 배치 (그리기 전이라 깜빡임 없음)
    const measure = () => {
      header.classList.remove('is-stacked')
      const wraps = nav.offsetTop > brand.offsetTop
      header.classList.toggle('is-stacked', wraps)
      updateScrollEdges(nav)
    }

    measure()
    const stopWatching = watchScrollEdges(nav, measure)
    // 글꼴(Pretendard)이 늦게 오면 글자 폭이 바뀌므로 다시 잼 (그 전에 화면을 떠났으면 건너뜀)
    let active = true
    void document.fonts?.ready.then(() => active && measure())
    return () => {
      active = false
      stopWatching()
    }
  }, [headerRef, layoutKey])

  // 메뉴 줄을 옆으로 밀어야 할 때: 지금 화면의 주제 칸이 보이도록 메뉴만 가로로 이동 (페이지 세로 스크롤은 그대로)
  useLayoutEffect(() => {
    const nav = headerRef.current?.querySelector<HTMLElement>('.site-nav')
    const active = nav?.querySelector<HTMLElement>('a[aria-current="page"], a.is-active')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const left = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft
    if (left < nav.scrollLeft || left + active.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = left - (nav.clientWidth - active.offsetWidth) / 2
    }
  }, [headerRef, activeKey])
}
