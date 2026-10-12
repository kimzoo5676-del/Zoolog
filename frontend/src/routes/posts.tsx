import { fetchPosts } from '../api/post'
import { MetaList } from '../components/MetaList'
import { PageHeader } from '../components/PageHeader'
import { PostList } from '../components/PostList'
import type { Route } from './+types/posts'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { posts: await fetchPosts({ signal: request.signal }) }
}

export default function Posts({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData

  return (
    <>
      <title>전체 | zoolog</title>
      <PageHeader title="전체">
        <MetaList items={[{ label: 'Posts', value: String(posts.length).padStart(2, '0') }]} />
      </PageHeader>
      <PostList posts={posts} />
    </>
  )
}
