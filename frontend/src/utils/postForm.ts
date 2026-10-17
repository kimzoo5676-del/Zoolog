import type { PostInput } from '../api/post'

// PostEditor 폼 값 → API 요청 본문. 주제는 CategoryPicker의 숨은 categoryId 입력 칸
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
