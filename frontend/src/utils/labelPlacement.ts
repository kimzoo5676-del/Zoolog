// 별 이름표 충돌 피하기: 각 이름표를 오른쪽 → 왼쪽 → 위 → 아래 순서로 시험해 겹치지 않는 첫 자리에 둠
// 좌표 단위는 화면 px (별 위치 × 배율). 결과 offset도 화면 px라 그릴 때 px 배율을 곱해 지도 단위로 바꿈

export type LabelPlacement = { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }

export type Rect = { left: number; top: number; right: number; bottom: number }

const FONT_SIZE = 13
const GAP = 10 // 별과 이름표 사이
const PAD = 3 // 이름표끼리 최소 간격

const CANDIDATES: LabelPlacement[] = [
  { dx: GAP, dy: 4.5, anchor: 'start' },
  { dx: -GAP, dy: 4.5, anchor: 'end' },
  { dx: 0, dy: -GAP, anchor: 'middle' },
  { dx: 0, dy: GAP + FONT_SIZE, anchor: 'middle' },
]

let canvas: HTMLCanvasElement | null = null

// 실제 글꼴로 글자 폭 측정 (캔버스 measureText)
export function textWidth(text: string, fontSize = FONT_SIZE, weight = 600) {
  canvas ??= document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return text.length * fontSize * 0.6
  context.font = `${weight} ${fontSize}px "Pretendard Variable", Pretendard, sans-serif`
  return context.measureText(text).width
}

function rectOf(x: number, y: number, width: number, p: LabelPlacement): Rect {
  const left = p.anchor === 'start' ? x + p.dx : p.anchor === 'end' ? x + p.dx - width : x - width / 2
  const baseline = y + p.dy
  return { left: left - PAD, right: left + width + PAD, top: baseline - FONT_SIZE, bottom: baseline + 3 }
}

export function overlaps(a: Rect, b: Rect) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

// 이미 자리가 정해진 이름표(주제 이름: 별 아래 가운데)의 영역
export function centeredLabelRect(x: number, y: number, text: string, fontSize: number, offsetY: number): Rect {
  const width = textWidth(text) * (fontSize / FONT_SIZE)
  const baseline = y + offsetY
  return { left: x - width / 2 - PAD, right: x + width / 2 + PAD, top: baseline - fontSize, bottom: baseline + 3 }
}

// 자리를 못 찾은 이름표는 결과에 없음 (그 글 별은 이름표 없이 그림)
// labels: 이름표를 붙일 별(화면 px 좌표), obstacles: 피해야 할 점(다른 별 위치), blocks: 피해야 할 영역(주제 이름표)
export function placeLabels(
  labels: { id: string; x: number; y: number; text: string; preferLeft: boolean }[],
  obstacles: { x: number; y: number }[],
  blocks: Rect[] = [],
): Map<string, LabelPlacement> {
  const placed: Rect[] = [
    ...obstacles.map((o) => ({ left: o.x - 6, right: o.x + 6, top: o.y - 6, bottom: o.y + 6 })),
    ...blocks,
  ]
  const result = new Map<string, LabelPlacement>()
  for (const label of labels) {
    const width = textWidth(label.text)
    // 부모 별에서 먼 쪽을 먼저 시험
    const order = label.preferLeft ? [CANDIDATES[1], CANDIDATES[0], CANDIDATES[2], CANDIDATES[3]] : CANDIDATES
    const choice = order.find((p) => {
      const rect = rectOf(label.x, label.y, width, p)
      return !placed.some((other) => overlaps(rect, other))
    })
    // 네 자리 모두 겹치면 이름표를 붙이지 않음 (2026-10-16: 휴대폰처럼 좁으면 겹쳐 그려졌음). 가리키면 큰 제목은 그대로
    if (!choice) continue
    placed.push(rectOf(label.x, label.y, width, choice))
    result.set(label.id, choice)
  }
  return result
}
