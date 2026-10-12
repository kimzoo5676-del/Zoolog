import type { Config } from '@react-router/dev/config'

export default {
  // 기존 src 폴더 유지 (기본값 app)
  appDirectory: 'src',
  // SPA 모드: 런타임 서버 렌더링 없이 빌드 시 index.html 생성, 배포 시 Spring/Nginx가 정적 제공
  ssr: false,
} satisfies Config
