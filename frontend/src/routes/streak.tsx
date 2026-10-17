import { useState, type CSSProperties } from 'react'
import { fetchPosts } from '../api/post'
import { PageHeader } from '../components/PageHeader'
import { RouteError } from '../components/RouteError'
import { StreakCard } from '../components/StreakCard'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { buildCategoryTree } from '../utils/categoryTree'
import { seoulDate, shiftMonth, streakOf } from '../utils/streak'
import type { Route } from './+types/streak'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { posts: await fetchPosts({ signal: request.signal }) }
}

// Streak (2026-10-13 소유자 결정, 반복 일정 화면 대체): 큰 주제마다 한 달 달력, 글 쓴 날을 하위 주제 색으로 칠함
// 주제를 만들면 달력이 저절로 생김. 이전·다음 달 이동은 모든 달력에 함께 적용
export default function Streak({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData
  const { categories } = useBlogLayoutData()
  const today = seoulDate(new Date())
  const thisMonth = today.slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  // 가장 오래된 글이 있는 달까지만 뒤로 (아직 쓰지 않은 '작성 예정' 글은 제외)
  const firstMonth = posts.reduce((min, p) => {
    if (!p.publishedAt) return min
    const m = seoulDate(p.publishedAt).slice(0, 7)
    return m < min ? m : min
  }, thisMonth)
  const [year, mon] = month.split('-')

  return (
    <>
      <title>Streak | zoolog</title>
      <PageHeader
        title="Streak"
        titleStyle={{ viewTransitionName: 'streak-title', viewTransitionClass: 'category-title' } as CSSProperties}
      >
        <nav className="month-nav" aria-label="달 이동">
          <button
            type="button"
            className="month-nav-button"
            aria-label="이전 달"
            disabled={month <= firstMonth}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ←
          </button>
          <p className="month-nav-label" aria-live="polite">
            {year}.{mon}
          </p>
          <button
            type="button"
            className="month-nav-button"
            aria-label="다음 달"
            disabled={month >= thisMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            →
          </button>
        </nav>
      </PageHeader>

      <div className="streak-grid" key={month}>
        {buildCategoryTree(categories).map((top) => {
          const { posts: mine, groups } = streakOf(top, posts)
          return <StreakCard key={top.id} name={top.name} month={month} today={today} posts={mine} groups={groups} />
        })}
      </div>
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
