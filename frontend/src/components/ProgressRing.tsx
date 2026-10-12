type ProgressRingProps = {
  done: number
  total: number
  size: number
  stroke: number
  className?: string
}

// 달성 링 (Apple 피트니스 활동 링에서 착안): 옅은 바탕 원 위에 러스트 호가 달성 비율만큼
export function ProgressRing({ done, total, size, stroke, className }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const length = 2 * Math.PI * r
  const ratio = total === 0 ? 0 : done / total
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
      {/* 달성 0이면 호를 그리지 않음 (둥근 끝 처리 때문에 길이 0이어도 점이 찍힘) */}
      {done > 0 && (
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length * ratio} ${length}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  )
}
