import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { collectGridLines, type GridLine } from '../utils/gridLines'
import { Logo } from './Logo'

// 단계별 시간(ms): (화면·글꼴 준비 대기) → Z 채움 → 잠시 멈춤 → 로고 이동·선 그리기 → 화면 걷힘
const FILL_MS = 1300 // index.css .preloader .logo-accent 애니메이션 시간과 같게 유지
const HOLD_MS = 150
const MOVE_MS = 800 // index.css --dur-travel과 같게 유지
const LINE_START_MS = 150
const LINE_MS = 600
const LINE_STAGGER_MS = 250
const FADE_MS = 300 // index.css --dur-fade(.preloader 투명도 전환)와 같게 유지

// wait: 차콜 로고만 표시하며 화면 데이터·글꼴 준비를 기다림 (Z 채움 전)
type Phase = 'wait' | 'fill' | 'move' | 'fade' | 'done'

// 루트 Layout의 <head>에서 HTML을 읽자마자 실행되는 스크립트
// 홈 화면(/, 전체 목록 /posts)을 불러올 때마다 재생. 다른 주소이거나 움직임 줄이기 설정이면 skip으로 표시해, CSS가 프리로더를 처음부터 숨김
export const INTRO_SCRIPT = `(function () {
  var root = document.documentElement;
  var isHome = /^\\/(posts\\/?)?$/.test(location.pathname);
  if (isHome && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.dataset.intro = 'play';
  } else {
    root.dataset.intro = 'skip';
  }
})();`

type PreloaderStageProps = {
  phase?: Phase
  logoRef?: Ref<HTMLSpanElement>
  logoStyle?: CSSProperties
  children?: ReactNode
}

// 화면 가운데 로고만 있는 프리로더 화면. JS 실행 전(HydrateFallback)과 실행 후(Preloader)가 같은 모양을 공유
export function PreloaderStage({ phase = 'wait', logoRef, logoStyle, children }: PreloaderStageProps) {
  return (
    <div className="preloader" data-phase={phase} aria-hidden="true">
      <Logo ref={logoRef} style={logoStyle} />
      {children}
    </div>
  )
}

function shouldPlay(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.intro === 'play'
}

// 홈 화면 프리로더: Z가 진한 러스트로 차오른 뒤 머리글 로고 자리로 이동하고, 격자선이 실제 위치에 그어진 다음 화면이 걷힘
// 이 컴포넌트는 화면 데이터(clientLoader)가 준비된 뒤에 렌더링되므로, 글꼴만 더 기다렸다가 채움 시작
export function Preloader() {
  const [phase, setPhase] = useState<Phase>(() => (shouldPlay() ? 'wait' : 'done'))
  const [logoTransform, setLogoTransform] = useState<string>()
  const [lines, setLines] = useState<GridLine[]>([])
  const logoRef = useRef<HTMLSpanElement>(null)
  const playing = phase !== 'done'

  // 프리로더가 떠 있는 동안 스크롤 잠금 (선 위치를 잰 뒤 화면이 움직이지 않도록)
  useEffect(() => {
    if (!playing) return
    const root = document.documentElement
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = ''
    }
  }, [playing])

  // 0단계: 글꼴(Pretendard)까지 준비되면 Z 채움 시작
  // 로딩이 느린 환경에서도 채움이 화면에 보이기 전에 끝나 버리지 않도록, 준비가 끝난 뒤에 시작
  useEffect(() => {
    if (phase !== 'wait') return
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) setPhase('fill')
    })
    return () => {
      cancelled = true
    }
  }, [phase])

  // 1단계 끝: Z 채움이 끝나면 머리글 로고와 격자선 위치를 재서 이동 시작
  useEffect(() => {
    if (phase !== 'fill') return
    const timer = setTimeout(() => {
      const source = logoRef.current
      const target = document.querySelector('.site-title .logo')
      if (!source || !target) {
        setPhase('fade')
        return
      }
      // FLIP 기법: 현재 위치(First)와 도착 위치(Last)의 차이만큼 이동·축소
      const from = source.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      setLogoTransform(`translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`)
      const shell = document.querySelector('.site-shell')
      setLines(shell ? collectGridLines(shell) : [])
      setPhase('move')
    }, FILL_MS + HOLD_MS)

    return () => clearTimeout(timer)
  }, [phase])

  // 2·3단계: 이동이 끝나면 화면을 걷고, 걷힘이 끝나면 프리로더 제거
  useEffect(() => {
    if (phase === 'move') {
      const timer = setTimeout(() => setPhase('fade'), Math.max(MOVE_MS, LINE_START_MS + LINE_STAGGER_MS + LINE_MS))
      return () => clearTimeout(timer)
    }
    if (phase === 'fade') {
      const timer = setTimeout(() => setPhase('done'), FADE_MS)
      return () => clearTimeout(timer)
    }
  }, [phase])

  if (!playing) return null

  return (
    <PreloaderStage phase={phase} logoRef={logoRef} logoStyle={{ transform: logoTransform }}>
      {lines.map((line, index) => (
        <span
          key={index}
          className="preloader-line"
          data-vertical={line.vertical || undefined}
          style={{
            left: line.x,
            top: line.y,
            width: line.width,
            height: line.height,
            backgroundColor: line.color,
            // 위쪽·왼쪽 선부터 차례로 그어짐
            animationDelay: `${
              LINE_START_MS +
              Math.round((line.vertical ? line.x / window.innerWidth : line.y / window.innerHeight) * LINE_STAGGER_MS)
            }ms`,
          }}
        />
      ))}
    </PreloaderStage>
  )
}
