import { useEffect } from 'react'
import { href, useNavigate, useRevalidator } from 'react-router'
import { fetchMe, logout } from '../api/auth'

const LOGIN = 'login'
const LOGOUT = 'logout'
const MAX_LENGTH = Math.max(LOGIN.length, LOGOUT.length)

// 소유자용 숨은 로그인·로그아웃 진입점: 화면에서 영문으로 연달아 입력
// - login: 비로그인은 Google 로그인 화면으로 바로 이동, 로그인 상태는 로그아웃할 수 있는 /login으로 이동
// - logout: 로그인 상태면 로그아웃 후 현재 화면 데이터를 다시 불러옴, 비로그인이면 아무 동작 없음
export function AuthShortcut() {
  const navigate = useNavigate()
  const { revalidate } = useRevalidator()

  useEffect(() => {
    let typed = ''

    function handleKeyDown(event: KeyboardEvent) {
      // 글자 입력 중(입력 칸, 한글 조합 중)이나 브라우저 단축키(Ctrl, Alt, Cmd 조합)는 무시
      if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || isEditable(event.target)) {
        return
      }
      // Shift, Enter 같은 글자가 아닌 키는 무시
      if (event.key.length !== 1) {
        return
      }
      typed = (typed + event.key.toLowerCase()).slice(-MAX_LENGTH)
      if (typed.endsWith(LOGIN)) {
        typed = ''
        void goToLogin()
      } else if (typed.endsWith(LOGOUT)) {
        typed = ''
        void logoutIfLoggedIn()
      }
    }

    async function goToLogin() {
      const me = await fetchMe().catch(() => null)
      if (me) {
        navigate(href('/login'))
      } else {
        // 라우터 이동이 아닌 전체 페이지 이동: 백엔드가 Google 동의 화면으로 리다이렉트
        window.location.assign('/oauth2/authorization/google')
      }
    }

    // fetchMe 응답이 XSRF-TOKEN 쿠키를 갱신하므로 logout의 CSRF 헤더도 함께 준비됨
    async function logoutIfLoggedIn() {
      const me = await fetchMe().catch(() => null)
      if (!me) {
        return
      }
      await logout()
      await revalidate()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, revalidate])

  return null
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}
