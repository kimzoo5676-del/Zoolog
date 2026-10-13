import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { href, Link, useViewTransitionState } from 'react-router'
import { DAYS } from '../utils/weekdays'
import { monthCells, type StreakGroup, type StreakPost } from '../utils/streak'

type StreakCardProps = {
  name: string
  month: string // "2026-10"
  today: string
  posts: StreakPost[]
  groups: StreakGroup[]
}

const TIP_WIDTH = 272 // px, 화면이 좁으면 달력 폭에 맞춤
const COLLAPSED_COUNT = 4 // 처음에는 4편까지, 나머지는 "+N"으로 펼침

// 큰 주제 하나의 글 스트릭: 한 달 달력(글 쓴 날을 하위 주제 색으로 N등분) + 색 범례
// 칠한 칸을 가리키면(마우스·키보드·탭) 그날 글 팝오버 (Apple HIG Popovers 방식, 2026-10-13):
// - 화살표가 칸을 가리키고 칸을 가리지 않음(칸 아래), 한 번에 하나만, 다른 칸으로 옮기면 같은 팝오버가 그 칸으로 미끄러져 이동
// - 내용은 작게: 4편까지 보이고 나머지는 "+N"으로 같은 자리에서 늘어남(크기 변화도 부드럽게)
// - 바깥을 누르거나 Esc, 글을 고르면 닫힘. 글 제목은 글 화면 제목 자리로 이어서 이동(공유 요소 전환)
export function StreakCard({ name, month, today, posts, groups }: StreakCardProps) {
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [tip, setTip] = useState({ top: 0, left: 0, arrow: 0, width: TIP_WIDTH })
  const [listHeight, setListHeight] = useState<number | null>(null)
  const [scrollable, setScrollable] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const calendarRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const byDate = new Map<string, StreakPost[]>()
  for (const post of posts) byDate.set(post.date, [...(byDate.get(post.date) ?? []), post])
  const cells = monthCells(month)
  const openPosts = openDate ? (byDate.get(openDate) ?? []) : []

  function open(date: string, cell: HTMLElement) {
    window.clearTimeout(closeTimer.current)
    const width = Math.min(TIP_WIDTH, calendarRef.current!.clientWidth)
    const center = cell.offsetLeft + cell.offsetWidth / 2
    const left = Math.min(Math.max(center - width / 2, 0), calendarRef.current!.clientWidth - width)
    setTip({ top: cell.offsetTop + cell.offsetHeight + 10, left, arrow: center - left, width })
    if (date !== openDate) setExpanded(false)
    setOpenDate(date)
  }

  function closeSoon() {
    window.clearTimeout(closeTimer.current)
    // 칸에서 팝오버로 마우스를 옮기는 동안 닫히지 않도록 잠깐 기다림
    closeTimer.current = window.setTimeout(() => setOpenDate(null), 200)
  }

  // 목록 높이: 접힘은 4편까지, 펼침은 전체(너무 길면 화면 60%에서 멈추고 그 안에서 스크롤)
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const items = list.children
    const collapsedHeight =
      items.length > COLLAPSED_COUNT
        ? (items[COLLAPSED_COUNT] as HTMLElement).offsetTop - list.offsetTop
        : list.scrollHeight
    const height = expanded ? Math.min(list.scrollHeight, window.innerHeight * 0.6) : collapsedHeight
    setListHeight(height)
    setScrollable(expanded && list.scrollHeight > height + 1)
  }, [openDate, expanded, openPosts.length])

  // 바깥을 누르면 닫힘 (터치 기기)
  useLayoutEffect(() => {
    if (!openDate) return
    const onDown = (e: PointerEvent) => {
      if (!calendarRef.current?.contains(e.target as Node)) setOpenDate(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [openDate])

  return (
    <article className="streak-card">
      <h2 className="streak-title">{name}</h2>

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
          if (dayPosts.length === 0) {
            const state = date > today ? ' is-future' : date === today ? ' is-today' : ''
            return (
              <span key={date} className={`streak-day${state}`}>
                {number}
              </span>
            )
          }
          // 그날 쓴 하위 주제 색으로 칸을 N등분 (세로 줄무늬)
          const colors = [...new Set(dayPosts.map((p) => p.color))]
          const background = `linear-gradient(90deg, ${colors
            .map((c, k) => `${c} ${(k / colors.length) * 100}% ${((k + 1) / colors.length) * 100}%`)
            .join(', ')})`
          return (
            <button
              key={date}
              type="button"
              className="streak-day is-filled"
              style={{ background }}
              aria-label={`${Number(date.slice(5, 7))}월 ${number}일 글 ${dayPosts.length}편`}
              aria-expanded={openDate === date}
              onPointerEnter={(e) => open(date, e.currentTarget)}
              onPointerLeave={closeSoon}
              onFocus={(e) => open(date, e.currentTarget)}
              onBlur={(e) => {
                if (!calendarRef.current?.querySelector('.streak-pop')?.contains(e.relatedTarget as Node)) closeSoon()
              }}
              onClick={(e) => open(date, e.currentTarget)}
            >
              {number}
            </button>
          )
        })}

        {openDate && openPosts.length > 0 && (
          <div
            className="streak-pop"
            role="dialog"
            aria-label={`${Number(openDate.slice(5, 7))}월 ${Number(openDate.slice(8))}일 글`}
            style={{ top: tip.top, left: tip.left, width: tip.width, '--arrow-x': `${tip.arrow}px` } as CSSProperties}
            onPointerEnter={() => window.clearTimeout(closeTimer.current)}
            onPointerLeave={closeSoon}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) closeSoon()
            }}
          >
            <ul
              ref={listRef}
              className="streak-pop-list"
              style={listHeight === null ? undefined : { height: listHeight }}
              data-scroll={scrollable}
            >
              {openPosts.map((post) => (
                <li key={post.id}>
                  <span className="streak-dot" style={{ background: post.color }} aria-hidden="true" />
                  <PopTitleLink post={post} />
                </li>
              ))}
            </ul>
            {openPosts.length > COLLAPSED_COUNT && (
              <button type="button" className="streak-pop-more" onClick={() => setExpanded((v) => !v)}>
                {expanded ? '접기' : `+${openPosts.length - COLLAPSED_COUNT}`}
              </button>
            )}
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <ul className="streak-legend" aria-label={`${name} 색 설명`}>
          {groups.map((g) => (
            <li key={g.name}>
              <span className="streak-dot" style={{ background: g.color }} aria-hidden="true" />
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// 팝오버 제목 → 글 화면 제목: 누른 제목만 view-transition-name "post-title"을 가져 그 자리로 이어서 이동 (목록·그래프와 같은 방식)
function PopTitleLink({ post }: { post: StreakPost }) {
  const to = href('/posts/:postId', { postId: String(post.id) })
  const isTransitioning = useViewTransitionState(to)
  return (
    <Link
      to={to}
      viewTransition
      className="streak-pop-title"
      style={isTransitioning ? { viewTransitionName: 'post-title' } : undefined}
    >
      {post.title}
    </Link>
  )
}
