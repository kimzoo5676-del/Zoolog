import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'build', '.react-router']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      // 라우트 모듈 export는 React Router Vite 플러그인이 HMR 처리 (React Router HMR 문서)
      reactRefresh.configs.vite({
        allowExportNames: [
          'meta',
          'links',
          'headers',
          'handle',
          'loader',
          'clientLoader',
          'action',
          'clientAction',
          'middleware',
          'clientMiddleware',
          'shouldRevalidate',
        ],
      }),
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
