import { useMemo } from 'react'

type Dot = {
  cx: number
  cy: number
  r: number
}

// 망점(halftone): 같은 간격으로 찍은 점의 크기로 농담을 표현하는 인쇄 기법
// 왼쪽 위는 작은 점, 오른쪽 아래로 갈수록 큰 점이 되어 끝에서는 점끼리 겹쳐 면이 됨
function createDots(width: number, height: number, spacing: number): Dot[] {
  const dots: Dot[] = []
  const maxRadius = spacing * 0.58
  const rowGap = spacing * 0.866 // 육각형 격자의 줄 간격 (sin 60°)

  for (let row = 0, y = rowGap / 2; y < height + rowGap; row++, y += rowGap) {
    // 한 줄씩 반 칸 밀어 인쇄 망점처럼 엇갈리게 배치
    const offset = row % 2 === 0 ? 0 : spacing / 2
    for (let x = offset; x < width + spacing; x += spacing) {
      const shade = Math.min(1, 0.6 * (x / width) + 0.4 * (y / height))
      dots.push({ cx: round(x), cy: round(y), r: round(maxRadius * (0.1 + 0.9 * shade)) })
    }
  }
  return dots
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

type HalftoneProps = {
  width?: number
  height?: number
  spacing?: number
  className?: string
}

// 장식용 러스트 망점 띠 (색은 CSS color로 지정, 스크린 리더에서 숨김)
export function Halftone({ width = 1200, height = 56, spacing = 12, className }: HalftoneProps) {
  const dots = useMemo(() => createDots(width, height, spacing), [width, height, spacing])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        {dots.map((dot, index) => (
          <circle key={index} cx={dot.cx} cy={dot.cy} r={dot.r} />
        ))}
      </g>
    </svg>
  )
}
