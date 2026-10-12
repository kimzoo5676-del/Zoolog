import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'

export default defineConfig({
  // React Router Vite 플러그인이 React Fast Refresh까지 처리 (@vitejs/plugin-react 대체)
  plugins: [reactRouter()],
  server: {
    // VS Code 포트 포워딩이 IPv6를 지원하지 않아 IPv4로 고정 (Vite Troubleshooting 문서)
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
