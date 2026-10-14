// 로그인 후 돌아갈 주소: Google 로그인은 성공하면 항상 "/"로 돌아오므로, 소유자 화면 주소를 잠시 기억했다가 이어서 이동
// (메일 속 뉴스 스크랩 링크를 로그인 안 된 휴대폰에서 열었을 때 기사 정보가 사라지지 않도록)
const KEY = 'zoolog:login-return'
const TTL_MS = 10 * 60 * 1000

export function rememberLoginReturn(path: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    // 저장소를 못 쓰면 로그인 후 홈에 머묾
  }
}

// 기억한 주소를 꺼내고 지움. 10분이 지났거나 사이트 안 주소가 아니면 버림
export function takeLoginReturn(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (!raw) return null
    const { path, at } = JSON.parse(raw) as { path?: unknown; at?: unknown }
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
    if (typeof at !== 'number' || Date.now() - at > TTL_MS) return null
    return path
  } catch {
    return null
  }
}
