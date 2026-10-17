import { href, redirect } from 'react-router'
import { createPost } from '../api/post'
import { PostEditor } from '../components/PostEditor'
import { RouteError } from '../components/RouteError'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { clearDraft, draftKey } from '../hooks/useDraftAutosave'
import { errorMessage, readPostInput } from '../utils/postForm'
import { requireOwner } from '../utils/requireOwner'
import type { Route } from './+types/post-new'

const NEW_POST_DRAFT = draftKey('post', 'new')

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireOwner(request.signal)
  return null
}

// 저장 성공 시 새 글로 이동, 실패 시 오류 문구 반환 (입력한 내용은 화면에 그대로 남음)
export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const post = await createPost(readPostInput(await request.formData()))
    clearDraft(NEW_POST_DRAFT)
    return redirect(href('/posts/:postId', { postId: String(post.id) }))
  } catch (error) {
    return { error: errorMessage(error, '글을 저장하지 못했어요') }
  }
}

export default function PostNew({ actionData }: Route.ComponentProps) {
  const { categories } = useBlogLayoutData()

  return (
    <>
      <title>글쓰기 | zoolog</title>
      <PostEditor categories={categories} error={actionData?.error} submitLabel="게시" exitTo="/" draftKey={NEW_POST_DRAFT} />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
