// 가로로 밀어서 보는 줄(머리글 메뉴 줄, 편집기 도구 막대): 가려진 쪽이 있으면 can-scroll-left/right 클래스
// index.css가 그쪽 끝을 흐리게(mask) 해서 더 있다는 것을 알림
export function updateScrollEdges(el: HTMLElement) {
  el.classList.toggle('can-scroll-left', el.scrollLeft > 1)
  el.classList.toggle('can-scroll-right', el.scrollWidth - el.clientWidth - el.scrollLeft > 1)
}

// 스크롤·창 크기 변경 때 다시 계산. 정리 함수를 돌려줌 (useLayoutEffect 안에서 사용)
export function watchScrollEdges(el: HTMLElement, onResize: () => void = () => updateScrollEdges(el)) {
  const onScroll = () => updateScrollEdges(el)
  updateScrollEdges(el)
  el.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  return () => {
    el.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
  }
}
