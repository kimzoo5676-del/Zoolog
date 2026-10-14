import { href, redirect } from 'react-router'
import { updatePost } from '../api/post'
import { PostEditor } from '../components/PostEditor'
import { RouteError } from '../components/RouteError'
import { useBlogLayoutData } from '../hooks/useBlogLayoutData'
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
      <PostEditor
        categories={categories}
        initial={{ categoryId: post.categoryId, title: post.title, content: post.content }}
        error={actionData?.error}
        submitLabel="저장"
        exitTo={href('/posts/:postId', { postId: String(post.id) })}
      />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
