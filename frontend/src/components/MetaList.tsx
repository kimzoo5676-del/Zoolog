import type { ReactNode } from 'react'

type MetaItem = {
  label: string
  value: ReactNode
}

type MetaListProps = {
  items: MetaItem[]
  className?: string
}

// 작은 대문자 라벨 + 값 묶음 (예: CATEGORY / Spring)
export function MetaList({ items, className = 'meta-list' }: MetaListProps) {
  return (
    <dl className={className}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
