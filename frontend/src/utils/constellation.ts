import type { Category } from '../api/category'
import type { PostSummary } from '../api/post'
import { buildCategoryTree, type CategoryNode } from './categoryTree'

// 홈 별자리 지도 배치 계산 (좌표 단위: 배율 1일 때 화면 px)
// 큰 주제 = 별자리 하나(뭉치). 모든 단계가 같은 규칙(재귀): 자기 글은 둘레에 해바라기씨 배열(phyllotaxis), 하위 주제는 바깥 고리 위
// 글이 수백 개여도 황금각 나선은 서로 겹치지 않고 고르게 퍼지므로 극단적인 개수에도 같은 규칙 유지

export type StarKind = 'top' | 'sub' | 'post'

export type StarNode = {
  id: string
  kind: StarKind
  // 주제 단계 (1: 큰 주제, 2: 하위, 3: 그 아래). 글은 부모 주제 단계 + 1
  depth: number
  x: number
  y: number
  label: string
  // 글 별: 속한 주제 이름 (제목 카드에 표시)
  group?: string
  // 이동할 주소 (주제 slug 또는 글 id)
  slug?: string
  postId?: number
  // 별자리 강조 계산용: 같은 큰 주제 묶음, 바로 위 별
  clusterId: string
  parentId?: string
  // 가운데에서 먼 정도(0~1): 등장 순서
  reveal: number
}

export type StarEdge = { from: string; to: string }

export type Constellation = {
  nodes: StarNode[]
  edges: StarEdge[]
  bounds: { minX: number; minY: number; width: number; height: number }
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // 약 137.5°
const POST_SPACING = 36 // 나선 간격: 글 별 사이 거리 (클수록 부모 별과 글을 잇는 선이 길어짐)
const SPIRAL_START = 4.5 // 나선 시작을 바깥으로: 부모 별(마름모 등) 둘레를 비우고 주위에 흩어지게 (작으면 붙어 뭉쳐 보임)
const CLUSTER_GAP = 96 // 별자리 사이 여백
const LABEL_ROOM = 40 // 이름표 자리
// 흔들림: 기계적인 원·나선 대신 실제 별자리처럼 불규칙하게 (값은 주제 id로 고정돼 새로고침해도 같은 모양)
const ANGLE_JITTER = 0.08 // 하위 주제 각도: 고른 간격의 ±8% (크면 겹침 방지 계산이 고리를 부풀려 글 별이 상대적으로 뭉쳐 보임)
const RING_JITTER = 0.25 // 하위 주제 거리: 기준보다 바깥쪽으로 최대 25%
const POST_JITTER = 0.55 // 글 별 각도 흔들림(라디안)

type Point = { x: number; y: number }

// seed 기반 의사 난수 (mulberry32): 같은 seed면 같은 수열 → 같은 모양
function seeded(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 황금각 나선에 거리·각도 흔들림: 겹치지 않으면서 자연스럽게 흩어짐
// gap: 비워 둘 각도(라디안). phase 반대쪽(부모에서 들어오는 선 방향)을 비워 별이 그 선 위에 얹히지 않게 함
// 나선이 만든 각도를 "gap을 뺀 나머지 호"로 균등하게 다시 펼치므로 나선 모양·간격은 유지
function spiral(count: number, phase: number, random: () => number, gap = 0): Point[] {
  const arc = 2 * Math.PI - gap
  return Array.from({ length: count }, (_, j) => {
    const r = POST_SPACING * Math.sqrt(j + SPIRAL_START) * (0.88 + random() * 0.3)
    const turn = (((j * GOLDEN_ANGLE + (random() - 0.5) * POST_JITTER) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const a = phase - arc / 2 + (turn / (2 * Math.PI)) * arc
    return { x: r * Math.cos(a), y: r * Math.sin(a) }
  })
}

// 부모 선 방향으로 비워 둘 각도: 좌우 약 25°씩
const PARENT_LINE_GAP = (50 * Math.PI) / 180

function spiralRadius(count: number) {
  return count === 0 ? 0 : POST_SPACING * Math.sqrt(count - 1 + SPIRAL_START) * 1.18
}

// 주제 id로 고정된 시작 각도: 새로고침해도 같은 모양
function phaseOf(id: number) {
  return ((id * 2654435761) % 360) * (Math.PI / 180)
}

type Cluster = {
  id: string
  radius: number
  nodes: StarNode[] // 별자리 중심 기준 좌표
  edges: StarEdge[]
}

// 별 사이 선: 각 글을 "자기보다 먼저 놓인 별 중 가장 가까운 별"과 이음 → 가지 뻗은 별자리 모양
function connectNearest(root: StarNode, stars: StarNode[]): StarEdge[] {
  const edges: StarEdge[] = []
  const placed: StarNode[] = [root]
  for (const star of stars) {
    let nearest = root
    let best = Infinity
    for (const other of placed) {
      const d = (other.x - star.x) ** 2 + (other.y - star.y) ** 2
      if (d < best) {
        best = d
        nearest = other
      }
    }
    edges.push({ from: nearest.id, to: star.id })
    placed.push(star)
  }
  return edges
}

function postStars(
  posts: PostSummary[],
  center: Point,
  phase: number,
  random: () => number,
  clusterId: string,
  parentId: string,
  gap: number,
) {
  return spiral(posts.length, phase, random, gap).map((p, j) => ({
    id: `post-${posts[j].id}`,
    kind: 'post' as const,
    depth: 0,
    x: center.x + p.x,
    y: center.y + p.y,
    label: posts[j].title,
    group: posts[j].categoryName,
    postId: posts[j].id,
    clusterId,
    parentId,
    reveal: 0,
  }))
}

// 고리 최소 반지름: 큰 주제 둘레는 넓게, 그 아래는 좁게
const MIN_RING = [0, 150, 110, 80]
const LABEL_GAP = 22
const LEAF_WIDTH = 0.7 // 글만 있는 주제의 옆 폭 비율 (작을수록 고리가 줄고 글 선이 길어 보임)

// radius: 중심에서 가장 먼 별까지, halfWidth: 바깥 방향과 수직인 옆 폭의 절반 (이웃과 겹침 계산용)
type Layout = { radius: number; halfWidth: number; nodes: StarNode[]; edges: StarEdge[] }

// 주제 하나를 (0, 0)에 두고 자기 글과 하위 주제를 배치. 하위 주제는 같은 함수로 먼저 배치한 뒤 고리 위로 옮김
function layoutCategory(
  category: CategoryNode,
  postsBySlug: Map<string, PostSummary[]>,
  clusterId: string,
  parentId: string | undefined,
  phase: number,
): Layout {
  const id = `cat-${category.id}`
  const star: StarNode = {
    id,
    kind: category.depth === 1 ? 'top' : 'sub',
    depth: category.depth,
    x: 0,
    y: 0,
    label: category.name,
    slug: category.slug,
    clusterId,
    parentId,
    reveal: 0,
  }
  const random = seeded(category.id * 7919)
  const direct = postsBySlug.get(category.slug) ?? []
  const count = category.children.length

  // 부모가 있으면 부모에서 들어오는 선 쪽(phase 반대편)을 비움
  const directStars = postStars(direct, star, phase, random, clusterId, id, parentId ? PARENT_LINE_GAP : 0)
  const directRadius = spiralRadius(direct.length)
  const nodes: StarNode[] = [star, ...directStars]
  const edges: StarEdge[] = connectNearest(star, directStars)

  // 하위 주제를 놓을 호: 큰 주제는 둘레 전체, 그 아래 단계는 부모로 돌아가는 방향(약 70°)을 비워 둠
  // (비우지 않으면 하위 주제의 가지가 부모 쪽 선과 겹침)
  const arc = parentId ? 2 * Math.PI * 0.8 : 2 * Math.PI
  const step = arc / Math.max(1, count)
  const start = parentId ? phase - arc / 2 + step / 2 : phase
  const children = category.children.map((child, i) => {
    const angle = start + step * i + (random() - 0.5) * 2 * ANGLE_JITTER * step
    const stretch = 1 + random() * RING_JITTER
    return { angle, stretch, layout: layoutCategory(child, postsBySlug, clusterId, id, angle) }
  })
  const maxChild = Math.max(0, ...children.map((c) => c.layout.radius))
  const maxHalfWidth = Math.max(0, ...children.map((c) => c.layout.halfWidth))

  // 고리 반지름: 자기 글과 겹치지 않고, 이웃 하위 주제끼리 옆 폭(halfWidth)이 겹치지 않도록
  // (하위 주제의 가지는 바깥으로 뻗으므로 옆 폭만 고려하면 고리가 불필요하게 부풀지 않음)
  const ring =
    count === 0
      ? 0
      : Math.max(
          MIN_RING[category.depth] ?? 48,
          directRadius + Math.min(maxChild, maxHalfWidth) + 20,
          // 각도 흔들림으로 이웃이 가까워질 수 있는 최소 간격(1 - 2×흔들림)을 기준으로 계산
          count > 1 ? (2 * maxHalfWidth + 16) / (2 * Math.sin(((1 - 2 * ANGLE_JITTER) * step) / 2)) : 0,
        )

  for (const { angle, stretch, layout } of children) {
    const dx = ring * stretch * Math.cos(angle)
    const dy = ring * stretch * Math.sin(angle)
    nodes.push(...layout.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })))
    edges.push({ from: id, to: layout.nodes[0].id }, ...layout.edges)
  }

  const radius = (count === 0 ? Math.max(directRadius, 12) : ring * (1 + RING_JITTER) + maxChild) + LABEL_GAP
  // 옆 폭: 하위 주제가 있는 주제는 둘레 전체를 쓰므로 반지름 그대로
  // 글만 있는 주제는 반지름의 70%: 이웃과 가장자리만 살짝 가까워지는 대신 고리가 줄어 부모 별과 글을 잇는 선이 상대적으로 길어 보임
  return { radius, halfWidth: count === 0 ? radius * LEAF_WIDTH : radius, nodes, edges }
}

function buildCluster(top: CategoryNode, postsBySlug: Map<string, PostSummary[]>): Cluster {
  const clusterId = `cat-${top.id}`
  const layout = layoutCategory(top, postsBySlug, clusterId, undefined, phaseOf(top.id))
  return { id: clusterId, radius: layout.radius + LABEL_ROOM, nodes: layout.nodes, edges: layout.edges }
}

// 별자리끼리 겹치지 않게 배치: 큰 별자리부터 가운데에 두고, 나머지는 나선을 따라 바깥으로 빈자리 탐색
// aspect(가로/세로): 화면 비율에 맞춰 나선을 늘림 → 넓은 화면은 가로로, 좁은 화면(모바일)은 세로로 퍼짐
function packClusters(clusters: Cluster[], aspect: number): Map<string, Point> {
  const stretchX = Math.sqrt(aspect)
  const stretchY = 1 / stretchX
  const placed: { c: Cluster; p: Point }[] = []
  const positions = new Map<string, Point>()
  for (const cluster of [...clusters].sort((a, b) => b.radius - a.radius)) {
    let point: Point = { x: 0, y: 0 }
    for (let k = 0; placed.length > 0; k++) {
      const r = 10 * Math.sqrt(k)
      const a = k * GOLDEN_ANGLE
      const candidate = { x: r * Math.cos(a) * stretchX, y: r * Math.sin(a) * stretchY }
      const fits = placed.every(
        ({ c, p }) => Math.hypot(p.x - candidate.x, p.y - candidate.y) >= c.radius + cluster.radius + CLUSTER_GAP,
      )
      if (fits) {
        point = candidate
        break
      }
    }
    placed.push({ c: cluster, p: point })
    positions.set(cluster.id, point)
  }
  return positions
}

export function layoutConstellation(categories: Category[], posts: PostSummary[], aspect = 1.8): Constellation {
  const postsBySlug = new Map<string, PostSummary[]>()
  for (const post of posts) {
    postsBySlug.set(post.categorySlug, [...(postsBySlug.get(post.categorySlug) ?? []), post])
  }
  const clusters = buildCategoryTree(categories).map((top) => buildCluster(top, postsBySlug))
  const positions = packClusters(clusters, aspect)

  const nodes: StarNode[] = []
  const edges: StarEdge[] = []
  for (const cluster of clusters) {
    const offset = positions.get(cluster.id) ?? { x: 0, y: 0 }
    nodes.push(...cluster.nodes.map((n) => ({ ...n, x: n.x + offset.x, y: n.y + offset.y })))
    edges.push(...cluster.edges)
  }

  if (nodes.length === 0) {
    return { nodes, edges, bounds: { minX: -100, minY: -100, width: 200, height: 200 } }
  }

  const pad = 48
  const minX = Math.min(...nodes.map((n) => n.x)) - pad
  const maxX = Math.max(...nodes.map((n) => n.x)) + pad
  const minY = Math.min(...nodes.map((n) => n.y)) - pad
  const maxY = Math.max(...nodes.map((n) => n.y)) + pad + LABEL_ROOM

  // 등장 순서: 지도 가운데에서 가까운 별부터 바깥으로 물결처럼
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const far = Math.max(1, ...nodes.map((n) => Math.hypot(n.x - cx, n.y - cy)))
  for (const node of nodes) {
    node.reveal = Math.hypot(node.x - cx, node.y - cy) / far
  }

  // 그리는 순서: 작은 별 → 하위 주제 → 큰 주제 (SVG는 나중에 그린 것이 위라 이름표가 별에 가려지지 않음)
  const order: Record<StarKind, number> = { post: 0, sub: 1, top: 2 }
  nodes.sort((a, b) => order[a.kind] - order[b.kind])

  return { nodes, edges, bounds: { minX, minY, width: maxX - minX, height: maxY - minY } }
}
