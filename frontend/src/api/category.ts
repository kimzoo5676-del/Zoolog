import { getJson, sendJson } from './http'

export type Category = {
  id: number
  name: string
  slug: string
  // null이면 큰 주제
  parentId: number | null
}

export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return getJson('/api/categories', '주제 목록을 불러오지 못했어요', signal)
}

// slug(주소용 이름)는 백엔드가 이름에서 자동 생성. parentId를 주면 그 주제의 하위 주제
export function createCategory(name: string, parentId: number | null = null): Promise<Category> {
  return sendJson('POST', '/api/categories', { name, parentId }, '주제를 추가하지 못했어요')
}
