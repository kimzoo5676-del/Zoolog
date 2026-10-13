import type { CSSProperties } from 'react'

// 주제 이름의 공유 요소 전환 이름 (하위 주제 칸 이름, 주제 화면 제목 공용)
// 주제 id별(cat-80)이라 한 화면 안에서 겹치지 않고, 칸 이름 ↔ 다음 화면 제목이 같은 이름으로 짝이 됨. 모양은 class로 한 번에 지정
export function categoryTitleTransition(id: number): CSSProperties {
  return { viewTransitionName: `cat-${id}`, viewTransitionClass: 'category-title' } as CSSProperties
}

// 주제 칸 자체의 전환 이름: 별(그래프의 모여든 별, 머리글 메뉴에서 튀어나온 별)이 이 칸 자리로 날아가 칸으로 커짐
export function tileTransition(id: number): CSSProperties {
  return { viewTransitionName: `tile-${id}`, viewTransitionClass: 'gather-tile' } as CSSProperties
}

// 머리글 메뉴 → 화면 제목: 누른 메뉴 글자에 다음 화면 제목과 같은 전환 이름을 잠깐 줌
// 머리글은 화면이 바뀌어도 그대로 남는 요소라 새 화면에서는 이름을 지워야 함 (제목과 이름이 겹치면 전환이 통째로 건너뛰어짐)
// → blog-layout이 주소가 바뀌는 순간(useLayoutEffect, 새 화면 캡처 전) clearPendingNames() 호출
const pending = new Set<HTMLElement>()
const spawned = new Set<HTMLElement>()

export function nameForTransition(element: Element | null, name: string) {
  if (!(element instanceof HTMLElement)) return
  // 이미 같은 이름을 가진 요소가 있으면(예: Category 화면의 같은 주제 칸) 그쪽이 이어지도록 양보
  if (document.querySelector(`[style*="view-transition-name: ${name};"]`)) return
  element.style.setProperty('view-transition-name', name)
  element.style.setProperty('view-transition-class', 'category-title')
  pending.add(element)
}

export function clearPendingNames() {
  for (const element of pending) {
    element.style.removeProperty('view-transition-name')
    element.style.removeProperty('view-transition-class')
  }
  pending.clear()
  for (const element of spawned) element.remove()
  spawned.clear()
}

// 그래프의 하위 주제 별(◎ 고리 두른 별)과 같은 모양
export const SUB_STAR_SVG =
  '<svg viewBox="-12 -12 24 24" focusable="false"><circle r="4.6"/><circle r="9.66" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>'

// 머리글 주제 메뉴 → 주제 화면: 메뉴 글자 아래에 하위 주제 수만큼 ◎ 별(칸 색)을 띄워 두면(tile-<id>)
// 화면 전환에서 각 ◎가 제 크기 그대로 자기 하위 주제 칸 가운데로 날아가고 칸이 그 주위로 펼쳐짐 (모였다가 나뉘는 느낌)
// 새 화면을 그리는 순간 clearPendingNames()가 띄운 별을 지움
export function spawnTileStars(from: Element | null, items: { id: number; dark: boolean }[]) {
  if (!from || items.length === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = from.getBoundingClientRect()
  const layer = document.createElement('div')
  layer.className = 'star-markers'
  layer.setAttribute('aria-hidden', 'true')
  items.forEach(({ id, dark }, index) => {
    const marker = document.createElement('span')
    marker.className = dark ? 'gather-marker is-sub is-menu is-dark' : 'gather-marker is-sub is-menu'
    // 메뉴 글자 아래쪽에서 살짝 흩어져 시작 (한 점에 겹치지 않도록)
    marker.style.left = `${rect.left + rect.width / 2 + (index - (items.length - 1) / 2) * 64}px`
    marker.style.top = `${rect.bottom + 40}px`
    marker.style.setProperty('view-transition-name', `tile-${id}`)
    marker.style.setProperty('view-transition-class', 'gather-tile')
    marker.innerHTML = SUB_STAR_SVG
    layer.append(marker)
  })
  document.body.append(layer)
  spawned.add(layer)
}

// 홈 그래프가 떠 있으면 머리글 주제 메뉴 클릭을 그래프가 받아 별을 모은 뒤 이동 (true를 돌려주면 처리함)
let homeCategoryHandler: ((categoryId: number) => boolean) | null = null

export function registerHomeCategoryHandler(handler: (categoryId: number) => boolean) {
  homeCategoryHandler = handler
  return () => {
    if (homeCategoryHandler === handler) homeCategoryHandler = null
  }
}

export function handleHomeCategory(categoryId: number) {
  return homeCategoryHandler?.(categoryId) ?? false
}
