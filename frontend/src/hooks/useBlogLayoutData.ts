import { useRouteLoaderData } from 'react-router'
import type { clientLoader } from '../routes/blog-layout'

// 하위 라우트에서 레이아웃이 불러온 주제 목록, 로그인 상태를 재사용 (중복 요청 방지)
export function useBlogLayoutData() {
  const data = useRouteLoaderData<typeof clientLoader>('routes/blog-layout')
  if (!data) {
    throw new Error('blog-layout 밖에서는 사용할 수 없어요')
  }
  return data
}
