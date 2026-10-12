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
      // Google 로그인 시작(/oauth2/authorization/google)과 콜백(/login/oauth2/code/google)
      // 문자열 단축형은 changeOrigin: true(Host를 localhost:8080으로 변경)라서 객체 형식 사용.
      // Host를 유지해야 백엔드가 콜백 주소를 http://localhost:5173 기준으로 만듦
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
      '/login/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
})
