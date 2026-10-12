import { csrfHeaders } from './auth'
import { toApiError } from './error'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 백엔드 spring.servlet.multipart.max-file-size와 같게

// 이미지 업로드(소유자 전용): 본문 마크다운에 넣을 주소를 돌려받음 (예: /api/images/3f2a....png)
// Content-Type은 브라우저가 multipart 경계값과 함께 자동 지정하므로 직접 넣지 않음
export async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('이미지는 10MB까지 올릴 수 있어요')
  }
  const body = new FormData()
  body.append('file', file)
  const response = await fetch('/api/images', { method: 'POST', headers: csrfHeaders(), body })
  if (!response.ok) {
    throw await toApiError(response, '이미지를 올리지 못했어요')
  }
  const { url } = (await response.json()) as { url: string }
  return url
}
