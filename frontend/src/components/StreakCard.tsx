import { useEffect, useRef, useState, type CSSProperties } from 'react'
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

const TIP_WIDTH = 256 // px, 화면이 좁으면 달력 폭에 맞춤

// 큰 주제 하나의 글 스트릭: 한 달 달력(글 쓴 날을 하위 주제 색으로 N등분) + 색 범례
// 칠한 칸을 가리키면(마우스·키보드·탭) 그날 글 팁 (2026-10-13 소유자 피드백 반영):
// - 칸 위에 뜨고 화살표가 칸을 가리킴(아래에 뜨면 다음 줄 날짜를 가려 불편), 칸 쪽에서 작게 시작해 커지며 서서히 나타나고 서서히 사라짐
// - 다른 칸으로 옮기면 같은 팁이 그 칸으로 미끄러져 이동
// - 글은 모두 보여 줌(펼치기 버튼 없음), 아주 많을 때만 팁 안에서 스크롤하되 기본 스크롤 막대는 숨기고 끝을 흐리게
// - 팁으로 마우스를 옮길 수 있게 잠깐 늦게 닫힘, 바깥 누름·Esc로 닫힘. 제목을 누르면 글 화면 제목 자리로 이어서 이동
export function StreakCard({ name, month, today, posts, groups }: StreakCardProps) {
  const [openDate, setOpenDate] = useState<string | null>(null)
  // 닫힐 때도 내용이 남아 있어야 서서히 사라짐 → 마지막으로 연 날짜를 따로 보관
  const [shownDate, setShownDate] = useState<string | null>(null)
  const [tip, setTip] = useState({ bottom: 0, left: 0, arrow: 0, width: TIP_WIDTH })
  const closeTimer = useRef<number | undefined>(undefined)
  const calendarRef = useRef<HTMLDivElement>(null)

  const byDate = new Map<string, StreakPost[]>()
  for (const post of posts) byDate.set(post.date, [...(byDate.get(post.date) ?? []), post])
  const cells = monthCells(month)
  const shownPosts = shownDate ? (byDate.get(shownDate) ?? []) : []

  // 바깥을 누르면 닫힘 (터치 기기)
  useEffect(() => {
    if (!openDate) return
    const onDown = (e: PointerEvent) => {
      if (!calendarRef.current?.contains(e.target as Node)) setOpenDate(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [openDate])

  function open(date: string, cell: HTMLElement) {
    window.clearTimeout(closeTimer.current)
    const calendar = calendarRef.current!
    const width = Math.min(TIP_WIDTH, calendar.clientWidth)
    const center = cell.offsetLeft + cell.offsetWidth / 2
    const left = Math.min(Math.max(center - width / 2, 0), calendar.clientWidth - width)
    setTip({ bottom: calendar.clientHeight - cell.offsetTop + 10, left, arrow: center - left, width })
    setOpenDate(date)
    setShownDate(date)
  }

  function closeSoon() {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenDate(null), 200)
  }

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
          const list = byDate.get(date) ?? []
          const number = Number(date.slice(8))
          if (list.length === 0) {
            const state = date > today ? ' is-future' : date === today ? ' is-today' : ''
            return (
              <span key={date} className={`streak-day${state}`}>
                {number}
              </span>
            )
          }
          // 그날 쓴 하위 주제 색으로 칸을 N등분 (세로 줄무늬)
          const colors = [...new Set(list.map((p) => p.color))]
          const background = `linear-gradient(90deg, ${colors
            .map((c, k) => `${c} ${(k / colors.length) * 100}% ${((k + 1) / colors.length) * 100}%`)
            .join(', ')})`
          return (
            <button
              key={date}
              type="button"
              className="streak-day is-filled"
              style={{ background }}
              aria-label={`${Number(date.slice(5, 7))}월 ${number}일 글 ${list.length}편`}
              aria-expanded={openDate === date}
              onPointerEnter={(e) => open(date, e.currentTarget)}
              onPointerLeave={closeSoon}
              onFocus={(e) => open(date, e.currentTarget)}
              onBlur={(e) => {
                if (!calendarRef.current?.querySelector('.streak-tip')?.contains(e.relatedTarget as Node)) closeSoon()
              }}
              onClick={(e) => open(date, e.currentTarget)}
            >
              {number}
            </button>
          )
        })}

        {/* 항상 그려 두고 열림 여부만 바꿈: 나타날 때·사라질 때 모두 전환 */}
        {shownDate && (
          <div
            className="streak-tip"
            role="dialog"
            aria-label={`${Number(shownDate.slice(5, 7))}월 ${Number(shownDate.slice(8))}일 글`}
            aria-hidden={openDate === null}
            inert={openDate === null}
            data-open={openDate !== null}
            style={
              { bottom: tip.bottom, left: tip.left, width: tip.width, '--arrow-x': `${tip.arrow}px` } as CSSProperties
            }
            onPointerEnter={() => window.clearTimeout(closeTimer.current)}
            onPointerLeave={closeSoon}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) closeSoon()
            }}
          >
            <ul className="streak-tip-list">
              {shownPosts.map((post) => (
                <li key={post.id}>
                  <span className="streak-dot" style={{ background: post.color }} aria-hidden="true" />
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
              <span className="streak-dot" style={{ background: g.color }} aria-hidden="true" />
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// 팁 제목 → 글 화면 제목: 누른 제목만 view-transition-name "post-title"을 가져 그 자리로 이어서 이동 (목록·그래프와 같은 방식)
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
