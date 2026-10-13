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
