import type { Category } from '../api/category'
import type { PostSummary } from '../api/post'

export type CategoryNode = Category & { depth: number; children: CategoryNode[] }

// API의 평평한 주제 목록(만든 순서) → 상위 주제마다 하위 주제를 묶은 트리 (최대 3단계, 순서 유지)
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<number | null, Category[]>()
  for (const category of categories) {
    byParent.set(category.parentId, [...(byParent.get(category.parentId) ?? []), category])
  }
  const build = (parentId: number | null, depth: number): CategoryNode[] =>
    (byParent.get(parentId) ?? []).map((category) => ({
      ...category,
      depth,
      children: build(category.id, depth + 1),
    }))
  return build(null, 1)
}

// 주제의 상위 경로 (큰 주제부터 자기 자신까지)
export function categoryPath(categories: Category[], id: number): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const path: Category[] = []
  for (let c = byId.get(id); c; c = c.parentId === null ? undefined : byId.get(c.parentId)) {
    path.unshift(c)
  }
  return path
}

// 주제 아래 모든 단계의 주제 id (자기 자신 포함)
export function descendantIds(categories: Category[], id: number): Set<number> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of categories) {
      if (c.parentId !== null && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        grew = true
      }
    }
  }
  return ids
}

// 주제 칸: parentId 바로 아래 주제마다 그 아래 모든 단계의 글 수 (null이면 큰 주제)
export function childTiles(categories: Category[], posts: PostSummary[], parentId: number | null) {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((child) => {
      const ids = descendantIds(categories, child.id)
      const slugs = new Set(categories.filter((c) => ids.has(c.id)).map((c) => c.slug))
      return { category: child, postCount: posts.filter((p) => slugs.has(p.categorySlug)).length }
    })
}
