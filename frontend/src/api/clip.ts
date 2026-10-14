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
