import { useEffect, useState } from 'react'

// 미디어 쿼리가 맞는지 (창 크기·설정이 바뀌면 다시 그림, 처음 값은 첫 렌더에서 읽음). onChange는 바뀌는 순간 한 번 불림
export function useMediaQuery(query: string, onChange?: (matches: boolean) => void) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => {
      setMatches(list.matches)
      onChange?.(list.matches)
    }
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
    // onChange는 호출한 쪽이 매번 새로 만들어도 다시 구독하지 않음 (query가 바뀔 때만)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])
  return matches
}
