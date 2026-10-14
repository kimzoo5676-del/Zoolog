import { data } from 'react-router'
import { fetchPost } from '../api/post'

// 글 화면·수정 화면 공통: 숫자가 아닌 id(/posts/abc)는 API 호출 없이, 없는 글은 조회 후 404
export async function loadPostOr404(postId: string, signal: AbortSignal) {
  if (!/^[1-9]\d*$/.test(postId)) {
    throw data('글을 찾을 수 없어요', { status: 404 })
  }
  const post = await fetchPost(Number(postId), signal)
  if (!post) {
    throw data('글을 찾을 수 없어요', { status: 404 })
  }
  return post
}
