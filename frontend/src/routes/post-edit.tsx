import { href, redirect } from 'react-router'
import { updatePost } from '../api/post'
import { PostEditor } from '../components/PostEditor'
import { RouteError } from '../components/RouteError'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
import { clearDraft, draftKey } from '../hooks/useDraftAutosave'
import { loadPostOr404 } from '../utils/loadPost'
import { errorMessage, readPostInput } from '../utils/postForm'
import { requireOwner } from '../utils/requireOwner'
import type { Route } from './+types/post-edit'

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  await requireOwner(request.signal)
  return { post: await loadPostOr404(params.postId, request.signal) }
}

export async function clientAction({ params, request }: Route.ClientActionArgs) {
  try {
    const post = await updatePost(Number(params.postId), readPostInput(await request.formData()))
    clearDraft(draftKey('post', params.postId))
    return redirect(href('/posts/:postId', { postId: String(post.id) }))
  } catch (error) {
    return { error: errorMessage(error, '글을 수정하지 못했어요') }
  }
}

export default function PostEdit({ loaderData, actionData }: Route.ComponentProps) {
  const { post } = loaderData
  const { categories } = useBlogLayoutData()

  return (
    <>
      <title>{`수정: ${post.title} | zoolog`}</title>
      {/* key: 다른 글 수정으로 바로 옮겨 가도 편집 상태·임시 저장 자리가 섞이지 않게 새로 그림 */}
      <PostEditor
        key={post.id}
        categories={categories}
        initial={{ categoryId: post.categoryId, title: post.title, content: post.content }}
        error={actionData?.error}
        submitLabel="저장"
        exitTo={href('/posts/:postId', { postId: String(post.id) })}
        draftKey={draftKey('post', post.id)}
      />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
