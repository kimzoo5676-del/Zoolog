import { csrfHeaders } from './auth'
import { toApiError } from './error'

export type Category = {
  id: number
  name: string
  slug: string
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch('/api/categories', { signal })
  if (!response.ok) {
    throw new Error(`주제 목록을 불러오지 못했어요 (HTTP ${response.status})`)
  }
  return response.json()
}

// slug(주소용 이름)는 백엔드가 이름에서 자동 생성
export async function createCategory(name: string): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    throw await toApiError(response, '주제를 추가하지 못했어요')
  }
  return response.json()
}
