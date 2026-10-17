import type { PostSummary } from '../api/post'
import type { CategoryNode } from './categoryTree'

// 글 스트릭 달력 계산 (2026-10-13 소유자 결정: 일정 대신 큰 주제마다 글 쓴 날을 하위 주제 색으로 칠함)

// 하위 주제 색 (세이지 배경 대비 4.2:1 이상, 칸 안 세이지 숫자도 읽힘). 하위 주제가 더 많으면 반복
const SUB_COLORS = ['#853d2b', '#2c5f66', '#3d4a8a', '#4d5a1e', '#74315f']
// 하위 주제 없이 큰 주제에 바로 쓴 글: 하위 주제가 있으면 차콜(범례 없이 구분만, 소유자 결정 2026-10-13), 없으면 첫 색
const DIRECT_COLOR = '#252a27'

export type StreakPost = PostSummary & { date: string; color: string; groupName: string }

export type StreakGroup = { name: string; color: string }

const seoulFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// 글 쓴 시각(UTC) → 한국 날짜 "YYYY-MM-DD"
export function seoulDate(iso: string | Date): string {
  return seoulFormatter.format(typeof iso === 'string' ? new Date(iso) : iso)
}

// "2026-10" → 그 달 달력 칸: 월요일 시작, 1일 앞은 빈칸(null)
export function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`)
  const lead = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ]
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

// 큰 주제 하나의 글 → 날짜·색이 붙은 글 목록과 범례(하위 주제 이름·색)
export function streakOf(top: CategoryNode, posts: PostSummary[]): { posts: StreakPost[]; groups: StreakGroup[] } {
  const groups: StreakGroup[] = top.children.map((sub, i) => ({
    name: sub.name,
    color: SUB_COLORS[i % SUB_COLORS.length],
  }))
  const directColor = top.children.length > 0 ? DIRECT_COLOR : SUB_COLORS[0]
  // slug → 하위 주제 묶음 (3단계 주제는 위 하위 주제 색을 따름)
  const groupBySlug = new Map<string, StreakGroup>([[top.slug, { name: top.name, color: directColor }]])
  top.children.forEach((sub, i) => {
    const walk = (node: CategoryNode) => {
      groupBySlug.set(node.slug, groups[i])
      node.children.forEach(walk)
    }
    walk(sub)
  })
  // 글 쓴 날 = 실제로 쓴 시각(publishedAt). 목차용으로 미리 만든 '작성 예정' 글(null)은 찍지 않음 (2026-10-16 소유자 요청)
  const mine = posts.flatMap((post) => {
    const group = groupBySlug.get(post.categorySlug)
    return group && post.publishedAt
      ? [{ ...post, date: seoulDate(post.publishedAt), color: group.color, groupName: group.name }]
      : []
  })
  return { posts: mine, groups }
}
