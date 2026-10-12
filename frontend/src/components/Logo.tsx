import type { CSSProperties, Ref } from 'react'

type LogoProps = {
  ref?: Ref<HTMLSpanElement>
  style?: CSSProperties
}

// 머리글과 프리로더가 같은 모양을 쓰도록 분리한 로고 글자 (첫 글자 Z만 강조)
export function Logo({ ref, style }: LogoProps) {
  return (
    <span ref={ref} className="logo" style={style}>
      <span className="logo-accent">Z</span>
      oolog
    </span>
  )
}
