import { csrfHeaders } from './auth'
import { toApiError } from './error'

export type Category = {
  id: number
  name: string
  slug: string
  // null이면 큰 주제
  parentId: number | null
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch('/api/categories', { signal })
  if (!response.ok) {
    throw new Error(`주제 목록을 불러오지 못했어요 (HTTP ${response.status})`)
  }
  return response.json()
}

// slug(주소용 이름)는 백엔드가 이름에서 자동 생성. parentId를 주면 그 주제의 하위 주제
export async function createCategory(name: string, parentId: number | null = null): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ name, parentId }),
  })
  if (!response.ok) {
    throw await toApiError(response, '주제를 추가하지 못했어요')
  }
  return response.json()
}
