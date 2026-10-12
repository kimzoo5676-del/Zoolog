import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/blog-layout.tsx', [
    index('routes/home.tsx'),
    route('posts', 'routes/posts.tsx'),
    route('posts/:postId', 'routes/post-detail.tsx'),
    route('categories/:slug', 'routes/category-posts.tsx'),
    route('login', 'routes/login.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig
