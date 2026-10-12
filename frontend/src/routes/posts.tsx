import { fetchPosts } from '../api/post'
import { PostList } from '../components/PostList'
import type { Route } from './+types/posts'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { posts: await fetchPosts({ signal: request.signal }) }
}

export default function Posts({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <title>전체 글 | zoolog</title>
      <h1 className="page-title">전체 글</h1>
      <PostList posts={loaderData.posts} />
    </>
  )
}
