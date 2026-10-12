import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

// 마우스로 링크를 눌러 이동하면 포커스가 그 링크에 남아, 이후 아무 키나 누르면 브라우저가 포커스 테두리(:focus-visible)를 표시.
// 마우스로 이동한 경우에만 포커스를 해제 (키보드로 이동한 경우는 위치를 알 수 있도록 유지)
export function PointerFocusReset() {
  const location = useLocation()
  const usedPointer = useRef(false)

  useEffect(() => {
    const onPointerDown = () => {
      usedPointer.current = true
    }
    const onKeyDown = () => {
      usedPointer.current = false
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (usedPointer.current && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [location.key])

  return null
}
