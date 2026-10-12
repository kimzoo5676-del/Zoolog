export type PostSummary = {
  id: number
  title: string
  categoryName: string
  categorySlug: string
  createdAt: string
}

export type PostDetail = {
  id: number
  title: string
  content: string
  categoryName: string
  categorySlug: string
  createdAt: string
  updatedAt: string
}

type FetchPostsOptions = {
  category?: string
  signal?: AbortSignal
}

export async function fetchPosts({ category, signal }: FetchPostsOptions = {}): Promise<PostSummary[]> {
  const query = category ? `?${new URLSearchParams({ category })}` : ''
  const response = await fetch(`/api/posts${query}`, { signal })
  if (!response.ok) {
    throw new Error(`글 목록을 불러오지 못했어요 (HTTP ${response.status})`)
  }
  return response.json()
}

// 없는 글(404)은 오류가 아닌 null로 반환, 404 화면 처리는 라우트에서 담당
export async function fetchPost(id: number, signal?: AbortSignal): Promise<PostDetail | null> {
  const response = await fetch(`/api/posts/${id}`, { signal })
  if (response.status === 404) {
    // 읽지 않은 응답 본문은 연결을 붙잡고 있으므로 취소해서 정리
    await response.body?.cancel()
    return null
  }
  if (!response.ok) {
    throw new Error(`글을 불러오지 못했어요 (HTTP ${response.status})`)
  }
  return response.json()
}
