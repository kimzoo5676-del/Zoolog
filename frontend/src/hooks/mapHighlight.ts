import { createContext, useContext } from 'react'

type MapHighlight = {
  // 머리글 주제 메뉴에서 가리킨 주제 slug (없으면 null)
  slug: string | null
  setSlug: (slug: string | null) => void
}

// 머리글 주제 메뉴 ↔ 홈 별자리 지도: 메뉴를 가리키면 그 주제의 별자리에 불이 들어옴
export const MapHighlightContext = createContext<MapHighlight>({ slug: null, setSlug: () => {} })

export function useMapHighlight() {
  return useContext(MapHighlightContext)
}
