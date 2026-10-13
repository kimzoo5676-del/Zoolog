import { useRef, useState } from 'react'
import { href, Link, useViewTransitionState } from 'react-router'
import { DAYS } from '../utils/weekdays'
import { currentStreak, monthCells, type StreakGroup, type StreakPost } from '../utils/streak'

type StreakCardProps = {
  name: string
  month: string // "2026-10"
  today: string
  posts: StreakPost[]
  groups: StreakGroup[]
}

// 큰 주제 하나의 글 스트릭: 연속 일수 + 이번 달 글 수 + 한 달 달력(글 쓴 날을 하위 주제 색으로) + 색 범례
// 칠한 칸을 가리키면(마우스·키보드) 그날 글이 팁으로 뜨고, 고르면 제목이 글 화면 제목 자리로 이어서 이동
export function StreakCard({ name, month, today, posts, groups }: StreakCardProps) {
  const [openDate, setOpenDate] = useState<string | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [tipPos, setTipPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 })

  const byDate = new Map<string, StreakPost[]>()
  for (const post of posts) byDate.set(post.date, [...(byDate.get(post.date) ?? []), post])
  const streak = currentStreak(new Set(byDate.keys()), today)
  const monthCount = posts.filter((p) => p.date.startsWith(month)).length
  const cells = monthCells(month)

  function open(date: string, cell: HTMLElement, column: number) {
    window.clearTimeout(closeTimer.current)
    const box = calendarRef.current!
    const top = cell.offsetTop + cell.offsetHeight + 6
    // 오른쪽 칸이면 팁을 오른쪽 끝에 맞춰 카드 밖으로 넘치지 않게
    setTipPos(
      column < 4
        ? { top, left: cell.offsetLeft }
        : { top, right: box.clientWidth - cell.offsetLeft - cell.offsetWidth },
    )
    setOpenDate(date)
  }

  function closeSoon() {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenDate(null), 180)
  }

  const openPosts = openDate ? (byDate.get(openDate) ?? []) : []

  return (
    <article className="streak-card">
      <header className="streak-head">
        <h2 className="streak-title">{name}</h2>
      </header>
      <div className="streak-numbers">
        <p>
          <strong>{streak}</strong>
          <span>일 연속</span>
        </p>
        <p>
          <strong>{monthCount}</strong>
          <span>이번 달 글</span>
        </p>
      </div>

      <div
        ref={calendarRef}
        className="streak-calendar"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpenDate(null)
        }}
      >
        {DAYS.map((d) => (
          <span key={d.value} className="streak-weekday" aria-hidden="true">
            {d.label}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} aria-hidden="true" />
          const dayPosts = byDate.get(date) ?? []
          const number = Number(date.slice(8))
          if (date > today) {
            return (
              <span key={date} className="streak-day is-future" aria-hidden="true">
                {number}
              </span>
            )
          }
          if (dayPosts.length === 0) {
            return (
              <span key={date} className={date === today ? 'streak-day is-today' : 'streak-day'}>
                {number}
              </span>
            )
          }
          // 같은 날 여러 하위 주제면 칸을 세로 줄무늬로 나눔
          const colors = [...new Set(dayPosts.map((p) => p.color))]
          const background =
            colors.length === 1
              ? colors[0]
              : `linear-gradient(90deg, ${colors.map((c, k) => `${c} ${(k / colors.length) * 100}% ${((k + 1) / colors.length) * 100}%`).join(', ')})`
          const column = i % 7
          return (
            <button
              key={date}
              type="button"
              className="streak-day is-filled"
              style={{ background }}
              aria-label={`${Number(date.slice(5, 7))}월 ${number}일 글 ${dayPosts.length}편`}
              aria-expanded={openDate === date}
              onPointerEnter={(e) => open(date, e.currentTarget, column)}
              onPointerLeave={closeSoon}
              onFocus={(e) => open(date, e.currentTarget, column)}
              onBlur={(e) => {
                if (!calendarRef.current?.querySelector('.streak-tip')?.contains(e.relatedTarget as Node)) closeSoon()
              }}
              onClick={(e) => (openDate === date ? setOpenDate(null) : open(date, e.currentTarget, column))}
            >
              {number}
            </button>
          )
        })}

        {openDate && openPosts.length > 0 && (
          <div
            key={openDate}
            className="streak-tip"
            role="dialog"
            aria-label={`${Number(openDate.slice(5, 7))}월 ${Number(openDate.slice(8))}일 글`}
            style={{ top: tipPos.top, left: tipPos.left, right: tipPos.right }}
            onPointerEnter={() => window.clearTimeout(closeTimer.current)}
            onPointerLeave={closeSoon}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) closeSoon()
            }}
          >
            <ul>
              {openPosts.map((post) => (
                <li key={post.id}>
                  <span className="streak-tip-group">
                    <span className="streak-swatch" style={{ background: post.color }} aria-hidden="true" />
                    {post.groupName}
                  </span>
                  <TipTitleLink post={post} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <ul className="streak-legend" aria-label={`${name} 색 설명`}>
          {groups.map((g) => (
            <li key={g.name}>
              <span className="streak-swatch" style={{ background: g.color }} aria-hidden="true" />
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// 팁의 제목 → 글 화면 제목: 누른 제목만 view-transition-name "post-title"을 가져 그 자리로 이어서 이동 (목록·그래프와 같은 방식)
function TipTitleLink({ post }: { post: StreakPost }) {
  const to = href('/posts/:postId', { postId: String(post.id) })
  const isTransitioning = useViewTransitionState(to)
  return (
    <Link
      to={to}
      viewTransition
      className="streak-tip-title"
      style={isTransitioning ? { viewTransitionName: 'post-title' } : undefined}
    >
      {post.title}
    </Link>
  )
}
