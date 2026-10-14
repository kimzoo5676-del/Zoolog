import { sendJson } from './http'
import type { PostDetail } from './post'

// 뉴스 스크랩: 아침 기사 메일의 기사 정보 + 소유자 코멘트 → News Clipping > 달 > 주 아래 글
type ClipInput = {
  title: string
  url: string
  source: string
  date: string
  comment: string
}

export function createClip(input: ClipInput): Promise<PostDetail> {
  return sendJson('POST', '/api/clips', input, '글을 저장하지 못했어요')
}

// 이미 스크랩한 기사면 그 글 번호, 아니면 null (204)
export async function findClippedPostId(url: string, signal?: AbortSignal): Promise<number | null> {
  const response = await fetch(`/api/clips?${new URLSearchParams({ url })}`, { signal })
  if (response.status === 204) {
    return null
  }
  if (!response.ok) {
    throw new Error(`스크랩 기록을 확인하지 못했어요 (HTTP ${response.status})`)
  }
  const { postId } = (await response.json()) as { postId: number }
  return postId
}
