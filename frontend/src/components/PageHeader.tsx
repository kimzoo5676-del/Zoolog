import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  children?: ReactNode
}

// 페이지 머리 칸: 왼쪽에 작은 대문자 라벨 + 큰 제목, 오른쪽에 children (예: 글 수)
export function PageHeader({ eyebrow, title, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
      </div>
      {children}
    </header>
  )
}
