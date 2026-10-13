import type { CSSProperties } from 'react'

// 주제 이름의 공유 요소 전환 이름 (하위 주제 칸 이름, 주제 화면 제목 공용)
// 주제 id별(cat-80)이라 한 화면 안에서 겹치지 않고, 칸 이름 ↔ 다음 화면 제목이 같은 이름으로 짝이 됨. 모양은 class로 한 번에 지정
export function categoryTitleTransition(id: number): CSSProperties {
  return { viewTransitionName: `cat-${id}`, viewTransitionClass: 'category-title' } as CSSProperties
}

// 큰 주제 칸 자체의 전환 이름: 홈 그래프에서 모여든 별(표지)이 이 칸 자리로 날아가 칸으로 커짐 (Category 화면에서만)
export function topTileTransition(id: number): CSSProperties {
  return { viewTransitionName: `tile-${id}`, viewTransitionClass: 'gather-tile' } as CSSProperties
}

// 머리글 메뉴 → 화면 제목: 누른 메뉴 글자에 다음 화면 제목과 같은 전환 이름을 잠깐 줌
// 머리글은 화면이 바뀌어도 그대로 남는 요소라 새 화면에서는 이름을 지워야 함 (제목과 이름이 겹치면 전환이 통째로 건너뛰어짐)
// → blog-layout이 주소가 바뀌는 순간(useLayoutEffect, 새 화면 캡처 전) clearPendingNames() 호출
const pending = new Set<HTMLElement>()

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
}
