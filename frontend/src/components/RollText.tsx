type RollTextProps = {
  children: string
}

// 마우스를 올리면 글자가 위로 빠지고 같은 글자가 아래에서 올라오는 효과
// 두 번째 글자는 장식용 복제본이라 스크린 리더에서 숨김 (제목을 두 번 읽지 않도록)
// 움직임은 가장 가까운 .roll-trigger 요소에 마우스를 올리거나 키보드 포커스가 들어올 때 시작
export function RollText({ children }: RollTextProps) {
  return (
    <span className="roll">
      <span className="roll-text">{children}</span>
      <span className="roll-text" aria-hidden="true">
        {children}
      </span>
    </span>
  )
}
