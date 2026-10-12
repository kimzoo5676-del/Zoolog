// 홈 지도 확대 상태(?focus=)만 바뀐 이동인지: 이때는 화면 데이터를 다시 불러올 필요 없음
export function onlyFocusChanged(currentUrl: URL, nextUrl: URL) {
  if (currentUrl.pathname !== nextUrl.pathname || currentUrl.search === nextUrl.search) return false
  const strip = (url: URL) => {
    const params = new URLSearchParams(url.search)
    params.delete('focus')
    return params.toString()
  }
  return strip(currentUrl) === strip(nextUrl)
}
