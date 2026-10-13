import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/blog-layout.tsx', [
    index('routes/home.tsx'),
    route('posts', 'routes/posts.tsx'),
    route('posts/new', 'routes/post-new.tsx'),
    route('posts/:postId', 'routes/post-detail.tsx'),
    route('posts/:postId/edit', 'routes/post-edit.tsx'),
    route('categories/:slug', 'routes/category-posts.tsx'),
    route('streak', 'routes/streak.tsx'),
    route('schedules', 'routes/schedules-redirect.tsx'),
    route('login', 'routes/login.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig
