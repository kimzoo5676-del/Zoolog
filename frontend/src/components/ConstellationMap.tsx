import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { href, Link, useNavigate } from 'react-router'
import type { Category } from '../api/category'
import type { PostSummary } from '../api/post'
import { useMapHighlight } from '../hooks/mapHighlight'
import { layoutConstellation, type StarNode } from '../utils/constellation'
import { centeredLabelRect, placeLabels, textWidth, type LabelPlacement } from '../utils/labelPlacement'
import { registerHomeCategoryHandler, tileTransition } from '../utils/viewTransition'
import { ViewSwitch } from './ViewSwitch'

type ConstellationMapProps = {
  categories: Category[]
  posts: PostSummary[]
  // 확대해 보고 있는 주제 slug (없으면 전체 지도). 주소(?focus=)에 기록해 뒤로 가기·공유 가능
  focusSlug: string | null
  onFocusChange: (slug: string | null) => void
}

// 확대·축소 시간: 첫 진입 프리로더(Z 채움 1.3초, 로고 이동 0.8초)와 비슷한 속도감
const GATHER_MS = 800 // index.css --dur-travel과 같게 유지 (별이 큰 주제 별로 모여드는 시간)
const ZOOM_MS = 1000 // index.css --dur-move와 같게 유지 (크기·위치가 크게 바뀌는 움직임)

// 단계마다 다른 별 모양 (성도에서 등급마다 기호를 달리하는 방식)
// 큰 주제 ✦ 4갈래 별 / 하위 주제 ◎ 고리 두른 별 / 세부 주제 ◆ 마름모 / 글 • 점
function sparkle(size: number) {
  return `M0 ${-size} Q0 0 ${size} 0 Q0 0 0 ${size} Q0 0 ${-size} 0 Q0 0 0 ${-size} Z`
}

function diamond(size: number) {
  return `M0 ${-size} L${size} 0 L0 ${size} L${-size} 0 Z`
}

// 단계별 별 크기·이름표 크기 (화면 px)
const STAR = {
  1: { core: 14, hit: 24, label: 17, labelY: 36 },
  2: { core: 4.6, hit: 17, label: 14, labelY: 27 },
  3: { core: 6, hit: 14, label: 13, labelY: 22 },
} as const
const POST_CORE = 3.6 // 글 별 반지름

function StarShape({ depth, px }: { depth: number; px: number }) {
  if (depth <= 1) return <path d={sparkle(STAR[1].core * px)} />
  if (depth === 2) {
    return (
      <>
        <circle r={STAR[2].core * px} />
        <circle r={STAR[2].core * 2.1 * px} fill="none" stroke="currentColor" strokeWidth={1.3 * px} />
      </>
    )
  }
  return <path d={diamond(STAR[3].core * px)} />
}

// 범례: 모양마다 무엇인지 (지도 왼쪽 아래)
const LEGEND = [
  { depth: 1, label: 'Category' },
  { depth: 2, label: 'Sub' },
  { depth: 3, label: 'Section' },
  { depth: 0, label: 'Post' },
]

type Box = { x: number; y: number; w: number; h: number }

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 천천히 출발해 가속한 뒤 부드럽게 멈추는 곡선 (ease-in-out cubic, CSS --ease-in-out-soft와 비슷한 느낌)
// 처음부터 빠르게 튀어나가는 ease-out은 "뚝딱" 느낌이라 프리로더와 같은 계열로 통일
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

// 보이는 범위(viewBox)를 목표로 부드럽게 옮김: 화면을 키우는 대신 범위를 좁히므로 별·글자는 같은 크기로 유지
// initial: 처음 그릴 때의 범위 (다른 화면에서 ?focus=로 들어오면 전체 지도에서 시작해 확대되며 들어옴)
function useAnimatedBox(target: Box, initial: Box): Box {
  const [box, setBox] = useState(initial)
  const current = useRef(initial)

  useEffect(() => {
    const from = current.current
    if (prefersReducedMotion()) {
      current.current = target
      setBox(target)
      return
    }
    const start = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / ZOOM_MS)
      const e = easeInOut(t)
      const next = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      }
      current.current = next
      setBox(next)
      if (t < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return box
}

// 홈 별자리 지도 (Obsidian 그래프 뷰에서 착안, 별자리 표현)
// 주제 별을 누르면 지도 안에서 그 별자리로 확대 (목록 화면으로 이동하지 않음), 목록은 오른쪽 위 "그래프 | 목록" 전환으로
// 키보드·스크린 리더는 주제 별(링크)로 이동, Enter로 확대, Esc로 한 단계 축소
export function ConstellationMap({ categories, posts, focusSlug, onFocusChange }: ConstellationMapProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [activeId, setActiveId] = useState<string | null>(null)
  // 화면을 떠나기 전 별이 모여드는 연출 (2026-10-13 소유자 결정)
  // all: Card(큰 주제 바둑판)로 갈 때 모든 별이 각자의 큰 주제 별(✦)로
  // category: 머리글 주제 메뉴를 누를 때 그 주제의 글·세부 주제 별이 각자의 하위 주제 별(◎)로, 다른 별은 흐려짐
  const [gathering, setGathering] = useState<{ mode: 'all' } | { mode: 'category'; topId: string } | null>(null)
  const navigate = useNavigate()

  // 좁은 화면(모바일)은 별자리를 세로로 쌓고, 넓은 화면은 화면 비율에 맞춰 가로로 펼침
  const narrow = size.width > 0 && size.width < 640
  const targetAspect = narrow ? 0.8 : size.height > 0 ? Math.max(1.2, size.width / size.height) : 1.9
  const roundedAspect = Math.round(targetAspect * 4) / 4 // 창 크기를 조금 바꿀 때마다 재배치되지 않도록
  // 두 번 계산: 먼저 배치해 화면에서 얼마나 축소되는지 잰 뒤, 축소되는 만큼 이름표 자리를 넓혀 다시 배치
  // (좁은 화면에서 지도가 작아져도 화면 px 고정인 이름끼리 겹치지 않도록)
  // 창 크기를 조금 바꿀 때마다 재배치되지 않도록 크기는 80px 단위로 반올림해 반영
  const layoutWidth = Math.round(size.width / 80) * 80
  const layoutHeight = Math.round(size.height / 80) * 80
  const { nodes, edges, bounds } = useMemo(() => {
    const first = layoutConstellation(categories, posts, roundedAspect)
    if (layoutWidth === 0 || layoutHeight === 0) return first
    const fit = Math.min(layoutWidth / first.bounds.width, layoutHeight / first.bounds.height)
    if (fit >= 0.95) return first
    return layoutConstellation(categories, posts, roundedAspect, Math.min(3, 1 / fit))
  }, [categories, posts, roundedAspect, layoutWidth, layoutHeight])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  // 큰 주제 별 (주제 id 순 = Category 화면 칸 순서)
  const topNodes = useMemo(
    () => nodes.filter((n) => n.kind === 'top').sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4))),
    [nodes],
  )
  // 모여들 자리까지의 거리 (지도 단위): all은 큰 주제 별, category는 그 주제 안에서 하위 주제 별(2단계)
  const gatherOffset = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    if (!gathering) return map
    for (const node of nodes) {
      let target = node
      if (gathering.mode === 'all') {
        while (target.parentId && byId.get(target.parentId)) target = byId.get(target.parentId)!
      } else if (node.clusterId === byId.get(gathering.topId)?.clusterId) {
        while (target.depth > 2 && target.parentId && byId.get(target.parentId)) target = byId.get(target.parentId)!
      }
      map.set(node.id, { x: target.x - node.x, y: target.y - node.y })
    }
    return map
  }, [nodes, byId, gathering])
  // 모인 별 표지: all은 큰 주제 별(✦), category는 그 주제의 하위 주제 별(◎). 주제 id 순 = 다음 화면 칸 순서
  const gatherTargets = useMemo(() => {
    if (!gathering) return []
    if (gathering.mode === 'all') return topNodes
    return nodes
      .filter((n) => n.kind === 'sub' && n.parentId === gathering.topId)
      .sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)))
  }, [gathering, nodes, topNodes])

  // 머리글 주제 메뉴를 누르면 이 지도가 받아 별을 모은 뒤 이동 (blog-layout → utils/viewTransition 등록)
  useEffect(() => {
    if (prefersReducedMotion()) return
    return registerHomeCategoryHandler((categoryId) => {
      const top = byId.get(`cat-${categoryId}`)
      if (!top?.slug) return false
      setActiveId(null)
      setGathering({ mode: 'category', topId: top.id })
      const slug = top.slug
      window.setTimeout(() => navigate(href('/categories/:slug', { slug }), { viewTransition: true }), GATHER_MS * 0.8)
      return true
    })
  }, [byId, navigate])

  // 별마다 상위 별 목록 (강조·확대 범위 계산용)
  const ancestors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const node of nodes) {
      const set = new Set<string>()
      for (let p = node.parentId; p; p = byId.get(p)?.parentId) set.add(p)
      map.set(node.id, set)
    }
    return map
  }, [nodes, byId])

  // 별의 묶음: 자기 자신 + 위쪽 별들 + (주제 별이면) 아래쪽 모든 별
  const groupOf = useMemo(
    () => (id: string) => {
      const node = byId.get(id)
      if (!node) return new Set<string>()
      const set = new Set<string>([id, ...(ancestors.get(id) ?? [])])
      if (node.kind !== 'post') {
        for (const n of nodes) if (ancestors.get(n.id)?.has(id)) set.add(n.id)
      }
      return set
    },
    [byId, ancestors, nodes],
  )

  // 지도 칸 크기 측정: 보이는 범위가 바뀌어도 별·글자는 일정한 화면 크기를 유지하기 위해
  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // 확대 대상: 주소의 focus slug에 해당하는 주제 별
  const focus = focusSlug ? nodes.find((n) => n.kind !== 'post' && n.slug === focusSlug) : undefined
  const focusGroup = useMemo(() => (focus ? groupOf(focus.id) : null), [focus, groupOf])

  // 목표 범위: 전체 지도, 또는 확대한 묶음(아래쪽 별 + 이름표 여유)
  const fullBox = useMemo<Box>(() => ({ x: bounds.minX, y: bounds.minY, w: bounds.width, h: bounds.height }), [bounds])
  const focusBox = useMemo<Box>(() => {
    if (!focus) return fullBox
    const group = nodes.filter((n) => n.id === focus.id || ancestors.get(n.id)?.has(focus.id))
    const minX = Math.min(...group.map((n) => n.x)) - 90
    const maxX = Math.max(...group.map((n) => n.x)) + 90
    const minY = Math.min(...group.map((n) => n.y)) - 60
    const maxY = Math.max(...group.map((n) => n.y)) + 70
    // 너무 작은 묶음은 지나치게 확대되지 않도록 최소 범위 (지도 단위 고정: 전체 지도 크기와 상관없이 같은 확대)
    const w = Math.max(maxX - minX, 300)
    const h = Math.max(maxY - minY, 220)
    // 위쪽은 확대 상태 막대가 덮으므로 범위를 위로 14% 더 넓힘
    const top = h * 0.14
    return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2 - top, w, h: h + top }
  }, [focus, nodes, ancestors, fullBox])
  const targetBox = focusBox
  const box = useAnimatedBox(targetBox, fullBox)

  // 글 별 클릭: 바로 글 화면으로. 마우스를 올려 떠 있던 큰 제목이 글 화면 제목 자리로 날아감
  // (같은 view-transition-name "post-title"을 가진 두 요소를 브라우저가 이어서 움직임, 공유 요소 전환)
  function openPost(event: MouseEvent, node: StarNode) {
    if (!node.postId) return
    const to = href('/posts/:postId', { postId: String(node.postId) })
    // 새 탭 열기(Ctrl/Cmd 클릭)는 그대로 새 탭, 움직임 줄이기 설정은 효과 없이 바로 이동
    if (event.metaKey || event.ctrlKey) {
      window.open(to, '_blank')
      return
    }
    navigate(to, { viewTransition: !prefersReducedMotion() })
  }

  // 전체 지도에서 Card: 별들이 큰 주제 별로 모여든 뒤(--dur-travel) 큰 주제 바둑판 화면으로
  // 움직임 줄이기 설정이나 새 탭 열기는 그대로 이동
  function gatherThenOpenCards(event: MouseEvent) {
    if (event.metaKey || event.ctrlKey || prefersReducedMotion()) return
    event.preventDefault()
    setActiveId(null)
    setGathering({ mode: 'all' })
    // 별이 거의 다 모였을 때 화면 전환을 시작해 모인 별이 곧바로 바둑판으로 이어지도록
    window.setTimeout(() => navigate('/posts', { viewTransition: true }), GATHER_MS * 0.8)
  }

  // preserveAspectRatio="xMidYMid meet": 보이는 범위 전체가 들어가는 배율, 남는 쪽은 가운데 정렬 여백
  const scale = size.width > 0 ? Math.min(size.width / box.w, size.height / box.h) : 1
  const px = 1 / Math.max(scale, 0.05) // 화면 1px에 해당하는 지도 단위
  const offsetX = (size.width - box.w * scale) / 2
  const offsetY = (size.height - box.h * scale) / 2

  const active = activeId ? byId.get(activeId) : undefined
  // 머리글 주제 메뉴에서 가리킨 주제: 지도 위를 직접 가리킬 때보다 우선순위 낮음
  const { slug: highlightSlug } = useMapHighlight()
  const highlighted = highlightSlug ? nodes.find((n) => n.kind !== 'post' && n.slug === highlightSlug) : undefined
  const pointedId = active?.id ?? highlighted?.id
  const lit = pointedId ? groupOf(pointedId) : null

  function parentSlug(node: StarNode) {
    return node.parentId ? (byId.get(node.parentId)?.slug ?? null) : null
  }

  // Esc: 한 단계 축소
  useEffect(() => {
    if (!focus) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFocusChange(parentSlug(focus))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function zoomTo(event: MouseEvent, node: StarNode) {
    // 새 탭 열기(Ctrl/Cmd 클릭)는 기본 링크 동작(주제 목록 화면)
    if (event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    setActiveId(null)
    onFocusChange(node.slug ?? null)
  }

  // 확대 상태의 경로: 큰 주제부터 확대한 주제까지
  const trail = focus
    ? [...(ancestors.get(focus.id) ?? [])]
        .map((id) => byId.get(id))
        .filter((n): n is StarNode => !!n)
        .sort((a, b) => a.depth - b.depth)
        .concat(focus)
    : []
  // 막대가 사라지는 동안에도 내용이 비지 않도록 마지막 경로 유지
  const [shownTrail, setShownTrail] = useState(trail)
  const trailKey = trail.map((n) => n.id).join('>')
  const shownKey = shownTrail.map((n) => n.id).join('>')
  if (trail.length > 0 && trailKey !== shownKey) setShownTrail(trail)

  // 막대 폭을 내용 폭으로 지정해 경로가 늘고 줄 때 폭이 부드럽게 바뀌도록 (CSS width 전환)
  const barInnerRef = useRef<HTMLDivElement>(null)
  const [barWidth, setBarWidth] = useState<number | null>(null)
  useEffect(() => {
    const element = barInnerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setBarWidth(entry.borderBoxSize[0]?.inlineSize ?? null))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // 많이 축소되면 작은 주제 이름은 가리킬 때만 (이름끼리 겹치지 않도록)
  const hideLabelsFrom = scale < 0.45 ? 2 : scale < 0.75 ? 3 : 4
  // 가장 깊은 단계(세부 주제)나 더 내려갈 주제가 없는 주제까지 확대하면 그 안 글 별 옆에 제목
  // (그 위 단계는 글이 많아 이름끼리 겹치므로 가리킬 때 카드로)
  const showPostLabels =
    !!focus && (focus.depth >= 3 || !nodes.some((n) => n.kind !== 'post' && n.parentId === focus.id))

  // 글 제목 자리: 확대가 끝난 배율 기준으로 한 번 계산 (확대 중에 자리가 바뀌며 흔들리지 않도록)
  const targetScale = size.width > 0 ? Math.min(size.width / targetBox.w, size.height / targetBox.h) : 1

  // 주제 이름표 정리: 큰 주제부터 차례로 놓고, 이미 놓인 이름과 겹치는 작은 주제 이름은 숨김(가리키면 보임)
  // 큰 주제 이름은 항상 보임. 확대가 끝난 배율 기준이라 확대 중에 이름이 깜빡이지 않음
  const crowdedLabels = useMemo(() => {
    const hidden = new Set<string>()
    const placed: ReturnType<typeof centeredLabelRect>[] = []
    const overlaps = (a: (typeof placed)[number], b: (typeof placed)[number]) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    const categoriesInView = nodes
      .filter((n) => n.kind !== 'post' && (!focusGroup || focusGroup.has(n.id)))
      .sort((a, b) => a.depth - b.depth)
    for (const n of categoriesInView) {
      const size = STAR[Math.min(3, Math.max(1, n.depth)) as 1 | 2 | 3]
      const rect = centeredLabelRect(n.x * targetScale, n.y * targetScale, n.label, size.label, size.labelY)
      if (n.depth > 1 && placed.some((other) => overlaps(rect, other))) {
        hidden.add(n.id)
      } else {
        placed.push(rect)
      }
    }
    return hidden
  }, [nodes, focusGroup, targetScale])
  const labelPlacements = useMemo(() => {
    if (!showPostLabels || !focusGroup) return new Map<string, LabelPlacement>()
    const group = nodes.filter((n) => focusGroup.has(n.id))
    const toScreen = (n: StarNode) => ({ x: n.x * targetScale, y: n.y * targetScale })
    return placeLabels(
      group
        .filter((n) => n.kind === 'post')
        .map((n) => ({
          id: n.id,
          ...toScreen(n),
          text: n.label,
          preferLeft: n.parentId ? n.x < (byId.get(n.parentId)?.x ?? n.x) : false,
        })),
      group.map(toScreen),
      // 주제 이름표(별 아래 가운데) 자리도 피함
      group
        .filter((n) => n.kind !== 'post')
        .map((n) => {
          const size = STAR[Math.min(3, Math.max(1, n.depth)) as 1 | 2 | 3]
          const p = toScreen(n)
          return centeredLabelRect(p.x, p.y, n.label, size.label, size.labelY)
        }),
    )
  }, [showPostLabels, focusGroup, nodes, targetScale, byId])

  return (
    <div
      className={`constellation${lit ? ' has-focus' : ''}${focus ? ' is-zoomed' : ''}${
        gathering ? ` is-gathering is-gathering-${gathering.mode}` : ''
      }`}
    >
      {/* 무대: svg와 글 카드의 공통 기준 (크기 측정, 카드 위치 계산) */}
      <div ref={stageRef} className="constellation-stage" onPointerLeave={() => setActiveId(null)}>
        <svg
          viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="주제 별자리 지도"
          // 빈 곳을 누르면 한 단계 축소
          onClick={(event) => {
            if (focus && event.target === event.currentTarget) onFocusChange(parentSlug(focus))
          }}
        >
          <g className="constellation-edges" strokeWidth={px} aria-hidden="true">
            {edges.map((edge) => {
              const a = byId.get(edge.from)
              const b = byId.get(edge.to)
              if (!a || !b) return null
              const on = lit?.has(a.id) && lit.has(b.id)
              const outside = focusGroup && !(focusGroup.has(a.id) && focusGroup.has(b.id))
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  pathLength={1}
                  className={on ? 'is-lit' : outside ? 'is-faint' : undefined}
                  style={{ '--reveal': b.reveal } as CSSProperties}
                />
              )
            })}
          </g>

          {nodes.map((node) => (
            <Star
              key={node.id}
              node={node}
              px={px}
              lit={lit ? lit.has(node.id) : null}
              faint={!!focusGroup && !focusGroup.has(node.id)}
              hideLabel={node.depth >= hideLabelsFrom || crowdedLabels.has(node.id)}
              showLabel={showPostLabels && node.kind === 'post' && !!focusGroup?.has(node.id)}
              labelPlacement={labelPlacements.get(node.id)}
              onActivate={() => setActiveId(node.id)}
              onLeave={() => setActiveId((current) => (current === node.id ? null : current))}
              onZoom={zoomTo}
              isTarget={node.kind === 'post' && node.id === activeId}
              onOpenPost={openPost}
              gather={gathering ? gatherOffset.get(node.id) : undefined}
            />
          ))}
        </svg>

        {/* 별이 모일 때: 모이는 자리(큰 주제 ✦ 또는 하위 주제 ◎)에서 별이 칸 색으로 커지고,
            화면 전환에서 그 크기 그대로 다음 화면 칸 가운데로 날아가며 칸이 펼쳐짐 (tile-<id>) */}
        {gathering && (
          <div className="gather-markers" aria-hidden="true">
            {gatherTargets.map((node, i) => (
              <span
                key={node.id}
                className={`gather-marker${node.kind === 'sub' ? ' is-sub' : ''}${
                  (Math.floor(i / 2) + (i % 2)) % 2 === 1 ? ' is-dark' : ''
                }`}
                style={{
                  left: (node.x - box.x) * scale + offsetX,
                  top: (node.y - box.y) * scale + offsetY,
                  // 별은 모일 때 커진 크기 그대로 칸 가운데까지 날아감 (index.css *.gather-tile)
                  ...tileTransition(Number(node.id.slice(4))),
                }}
              >
                {/* 그래프의 별과 같은 모양 (큰 주제 ✦, 하위 주제 ◎), 칸 색 */}
                {node.kind === 'sub' ? (
                  <svg viewBox="-12 -12 24 24" focusable="false">
                    <StarShape depth={2} px={1} />
                  </svg>
                ) : (
                  <svg viewBox="-14 -14 28 28" focusable="false">
                    <StarShape depth={1} px={1} />
                  </svg>
                )}
              </span>
            ))}
          </div>
        )}

        {/* 확대 상태 막대: [esc] 경로(누르면 그 단계로)
            항상 그려 두고 확대할 때만 보이게 전환 (갑자기 생기거나 사라지지 않도록), 숨김 상태는 inert */}
        <nav
          className={`constellation-bar${focus ? ' is-visible' : ''}`}
          aria-label="별자리 확대 위치"
          inert={!focus}
          // 테두리 좌우 1px씩 포함 (box-sizing: border-box)
          style={barWidth ? { width: barWidth + 2 } : undefined}
        >
          <div ref={barInnerRef} className="bar-inner">
            {/* 한 단계 위로: 키보드 Esc와 같은 동작, 키 모양으로 단축키를 함께 알려 줌 */}
            <button
              type="button"
              className="bar-up"
              onClick={() => focus && onFocusChange(parentSlug(focus))}
              aria-label="한 단계 위로 (Esc)"
              aria-keyshortcuts="Escape"
            >
              <kbd>esc</kbd>
            </button>
            <ol className="bar-trail">
              {shownTrail.map((node, i) => (
                <li key={node.id}>
                  {i === shownTrail.length - 1 ? (
                    <span aria-current="location">{node.label}</span>
                  ) : (
                    <button type="button" onClick={() => onFocusChange(node.slug ?? null)}>
                      {node.label}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* 보기 전환: 확대한 주제가 있으면 그 주제 목록, 없으면 전체 목록 */}
        <ViewSwitch
          current="graph"
          graphTo={focus ? { pathname: '/', search: `?focus=${encodeURIComponent(focus.slug ?? '')}` } : '/'}
          listTo={focus?.slug ? href('/categories/:slug', { slug: focus.slug }) : '/posts'}
          className="view-switch constellation-switch"
          onListClick={focus ? undefined : gatherThenOpenCards}
          // 전체 지도의 Card 글자 → Category 화면 제목 (글자가 이동하며 Card에서 Category로 바뀜)
          listStyle={focus ? undefined : { viewTransitionName: 'view-title' }}
        />

        <ul className="constellation-legend">
          {LEGEND.map(({ depth, label }) => (
            <li key={label}>
              <svg viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
                <g className="legend-shape">
                  {depth === 0 ? <circle r={POST_CORE} /> : <StarShape depth={depth} px={0.8} />}
                </g>
              </svg>
              {label}
            </li>
          ))}
        </ul>

        {/* 가리킨 글 별: 별이 커지고 주제 + 큰 제목이 별 쪽에서부터 커지며 나타남
            방향은 작은 제목이 있던 쪽(이름표 배치 결과), 없으면 오른쪽(화면 오른쪽 끝이라 넘칠 때만 왼쪽)
            큰 제목은 글 화면 제목(h1)과 같은 view-transition-name이라, 클릭하면 그대로 글 화면 제목 자리로 이동·확대 */}
        {active?.kind === 'post' && (
          <HoverTitle
            node={active}
            x={(active.x - box.x) * scale + offsetX}
            y={(active.y - box.y) * scale + offsetY}
            stageWidth={size.width}
            placement={labelPlacements.get(active.id)}
          />
        )}
      </div>
    </div>
  )
}

type StarProps = {
  node: StarNode
  px: number
  // null: 아무것도 가리키지 않음, true/false: 강조 여부
  lit: boolean | null
  // 확대한 묶음 밖의 별
  faint: boolean
  hideLabel: boolean
  // 글 별 제목 표시 (가장 깊은 단계까지 확대했을 때)
  showLabel: boolean
  onActivate: () => void
  onLeave: () => void
  // 글 제목 자리 (겹침을 피해 고른 위치, 화면 px)
  labelPlacement?: LabelPlacement
  onZoom: (event: MouseEvent, node: StarNode) => void
  // 마우스를 올린 글 별 (커지고, 자기 작은 제목은 숨김: 떠오른 큰 제목과 겹치지 않도록)
  isTarget?: boolean
  // Card로 갈 때 큰 주제 별까지 모여들 거리 (지도 단위)
  gather?: { x: number; y: number }
  onOpenPost: (event: MouseEvent, node: StarNode) => void
}

function Star({
  node,
  px,
  lit,
  faint,
  hideLabel,
  showLabel,
  labelPlacement,
  onActivate,
  onLeave,
  onZoom,
  isTarget,
  onOpenPost,
  gather,
}: StarProps) {
  const className = `star star-${node.kind}${lit === false ? ' is-dim' : ''}${lit ? ' is-lit' : ''}${
    faint ? ' is-faint' : ''
  }${hideLabel ? ' is-label-hidden' : ''}${isTarget ? ' is-target' : ''}`
  const style = {
    '--reveal': node.reveal,
    '--twinkle': (node.postId ?? 0) % 7,
    ...(gather && { '--gx': `${gather.x}px`, '--gy': `${gather.y}px` }),
  } as CSSProperties
  const transform = `translate(${node.x} ${node.y})`

  if (node.kind === 'post') {
    return (
      <g
        className={className}
        style={style}
        transform={transform}
        onPointerEnter={onActivate}
        onPointerLeave={onLeave}
        onClick={(event) => onOpenPost(event, node)}
        aria-hidden="true"
      >
        {/* 작은 별도 누르기 쉽도록 보이지 않는 넓은 영역 */}
        <circle r={12 * px} className="star-hit" />
        <circle r={POST_CORE * px} className="star-core" />
        {/* 제목: 이웃 제목·별과 겹치지 않는 자리 (utils/labelPlacement.ts) */}
        {showLabel && (
          <text
            className="star-label star-post-label"
            x={(labelPlacement?.dx ?? 10) * px}
            y={(labelPlacement?.dy ?? 4.5) * px}
            textAnchor={labelPlacement?.anchor ?? 'start'}
            fontSize={13 * px}
            strokeWidth={4 * px}
          >
            {node.label}
          </text>
        )}
      </g>
    )
  }

  const size = STAR[Math.min(3, Math.max(1, node.depth)) as 1 | 2 | 3]
  // SVG 안의 Link는 SVG <a>로 렌더링됨. 위치 이동은 바깥 <g>가 담당
  // 일반 클릭·Enter는 지도 안 확대, Ctrl/Cmd 클릭은 주제 목록 화면을 새 탭으로
  return (
    <g transform={transform}>
      <Link
        to={href('/categories/:slug', { slug: node.slug ?? '' })}
        className={className}
        style={style}
        onClick={(event) => onZoom(event, node)}
        onPointerEnter={onActivate}
        onPointerLeave={onLeave}
        onFocus={onActivate}
        onBlur={onLeave}
      >
        <circle r={size.hit * px} className="star-hit" />
        <g className="star-core">
          <StarShape depth={node.depth} px={px} />
        </g>
        <text
          className="star-label"
          y={size.labelY * px}
          textAnchor="middle"
          fontSize={size.label * px}
          strokeWidth={4 * px}
        >
          {node.label}
        </text>
      </Link>
    </g>
  )
}

type HoverTitleProps = {
  node: StarNode
  x: number
  y: number
  stageWidth: number
  placement?: LabelPlacement
}

// 큰 제목이 놓일 쪽: right(별 오른쪽), left(별 왼쪽), above(별 위), below(별 아래)
function HoverTitle({ node, x, y, stageWidth, placement }: HoverTitleProps) {
  const side = placement
    ? placement.anchor === 'end'
      ? 'left'
      : placement.anchor === 'middle'
        ? placement.dy < 0
          ? 'above'
          : 'below'
        : 'right'
    : // 오른쪽에 큰 제목(20px, 굵기 900)이 실제로 안 들어갈 때만 왼쪽
      x + 14 + textWidth(node.label, 20, 900) > stageWidth
      ? 'left'
      : 'right'

  return (
    <div className={`hover-title is-${side}`} style={{ left: x, top: y }} aria-hidden="true">
      <span className="hover-title-group">{node.group}</span>
      <span className="hover-title-text">{node.label}</span>
    </div>
  )
}
