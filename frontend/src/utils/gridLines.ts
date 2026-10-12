export type GridLine = {
  x: number
  y: number
  width: number
  height: number
  color: string
  vertical: boolean
}

const SIDES = [
  { name: 'top', vertical: false },
  { name: 'bottom', vertical: false },
  { name: 'left', vertical: true },
  { name: 'right', vertical: true },
] as const

// root와 그 안 요소들의 테두리(border)를 읽어 화면에 보이는 선의 위치를 계산
// 좌표를 코드에 적지 않고 실제 레이아웃에서 재므로, 화면 구성이 바뀌어도 선 위치가 자동으로 맞음
// maxWidth보다 두꺼운 테두리(인용·코드 블록의 장식 막대)는 선으로 보지 않음
export function collectGridLines(root: Element, maxWidth = 2): GridLine[] {
  const lines: GridLine[] = []
  const viewportHeight = window.innerHeight

  for (const element of [root, ...root.querySelectorAll('*')]) {
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue

    const style = getComputedStyle(element)
    for (const side of SIDES) {
      const width = parseFloat(style.getPropertyValue(`border-${side.name}-width`))
      if (!width || width > maxWidth || style.getPropertyValue(`border-${side.name}-style`) !== 'solid') continue

      const color = style.getPropertyValue(`border-${side.name}-color`)
      if (side.vertical) {
        // 세로선은 화면 안에 보이는 부분만
        const top = Math.max(rect.top, 0)
        const bottom = Math.min(rect.bottom, viewportHeight)
        const x = side.name === 'left' ? rect.left : rect.right - width
        lines.push({ x, y: top, width, height: bottom - top, color, vertical: true })
      } else {
        const y = side.name === 'top' ? rect.top : rect.bottom - width
        if (y < 0 || y >= viewportHeight) continue
        lines.push({ x: rect.left, y, width: rect.width, height: width, color, vertical: false })
      }
    }
  }
  return lines
}
