import { csrfHeaders } from './auth'
import { toApiError } from './error'

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
  categoryId: number
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

export type PostInput = {
  categoryId: number
  title: string
  content: string
}

export async function createPost(input: PostInput): Promise<PostDetail> {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response, '글을 저장하지 못했어요')
  }
  return response.json()
}

export async function updatePost(id: number, input: PostInput): Promise<PostDetail> {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response, '글을 수정하지 못했어요')
  }
  return response.json()
}

export async function deletePost(id: number): Promise<void> {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  })
  if (!response.ok) {
    throw await toApiError(response, '글을 삭제하지 못했어요')
  }
}
