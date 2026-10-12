import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // VS Code 포트 포워딩이 IPv6를 지원하지 않아 IPv4로 고정 (Vite Troubleshooting 문서)
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})