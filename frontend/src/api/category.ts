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
