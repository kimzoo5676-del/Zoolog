import { Link, type To } from 'react-router'

type ViewSwitchProps = {
  // 지금 보기. 글 화면처럼 그래프도 목록도 아니면 생략 (두 쪽 모두 선택되지 않은 상태)
  current?: 'graph' | 'list'
  graphTo: To
  listTo: To
  className?: string
}

// 보기 전환 (세그먼트 컨트롤): 그래프 | 목록. 선택된 쪽은 진한 러스트 칸, 나머지는 옅은 글자
// 그래프 = 홈 별자리 지도 (Obsidian "그래프 뷰"에서 가져온 일반적인 이름)
export function ViewSwitch({ current, graphTo, listTo, className = 'view-switch' }: ViewSwitchProps) {
  return (
    <nav className={className} aria-label="보기 전환">
      <Link to={graphTo} aria-current={current === 'graph' ? 'page' : undefined} viewTransition>
        그래프
      </Link>
      <Link to={listTo} aria-current={current === 'list' ? 'page' : undefined} viewTransition>
        목록
      </Link>
    </nav>
  )
}
