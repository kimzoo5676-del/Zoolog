import { csrfHeaders } from './auth'
import { toApiError } from './error'
import type { PostDetail } from './post'

// 뉴스 스크랩: 아침 기사 메일의 기사 정보 + 소유자 코멘트 → News Clipping > 달 > 주 아래 글
export type ClipInput = {
  title: string
  url: string
  source: string
  date: string
  comment: string
}

export async function createClip(input: ClipInput): Promise<PostDetail> {
  const response = await fetch('/api/clips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response, '글을 저장하지 못했어요')
  }
  return response.json()
}
