import type { PostInput } from '../api/post'

// PostEditor 폼 값 → API 요청 본문. 주제 select는 form 속성으로 같은 폼에 포함됨
export function readPostInput(formData: FormData): PostInput {
  return {
    categoryId: Number(formData.get('categoryId')),
    title: String(formData.get('title') ?? ''),
    content: String(formData.get('content') ?? ''),
  }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
