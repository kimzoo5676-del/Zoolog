import type { CSSProperties, MouseEvent } from 'react'
import { Link, type To } from 'react-router'

type ViewSwitchProps = {
  // 지금 보기. 글 화면처럼 그래프도 목록도 아니면 생략 (두 쪽 모두 선택되지 않은 상태)
  current?: 'graph' | 'list'
  graphTo: To
  listTo: To
  className?: string
  // Card를 누를 때 이동 전에 할 일 (예: 그래프 별이 모여드는 연출)
  onListClick?: (event: MouseEvent) => void
  // Card 글자에만 줄 스타일 (예: 홈의 Card → Category 제목으로 이어지는 공유 요소 전환 이름)
  listStyle?: CSSProperties
}

// 보기 전환 (세그먼트 컨트롤): Graph | Card (2026-10-13 소유자 결정, 이전 문구 그래프 | 목록). 선택된 쪽은 진한 러스트 칸, 나머지는 옅은 글자
// Graph = 홈 별자리 지도 (Obsidian "그래프 뷰"에서 가져온 일반적인 이름), Card = 주제 화면의 칸·카드 판
export function ViewSwitch({
  current,
  graphTo,
  listTo,
  className = 'view-switch',
  onListClick,
  listStyle,
}: ViewSwitchProps) {
  return (
    <nav className={className} aria-label="보기 전환">
      <Link to={graphTo} aria-current={current === 'graph' ? 'page' : undefined} viewTransition>
        Graph
      </Link>
      <Link to={listTo} aria-current={current === 'list' ? 'page' : undefined} viewTransition onClick={onListClick}>
        <span style={listStyle}>Card</span>
      </Link>
    </nav>
  )
}
