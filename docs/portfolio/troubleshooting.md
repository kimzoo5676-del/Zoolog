# 트러블슈팅 기록

형식: 증상 → 원인 → 해결 → 배운 점. 면접·자소서의 "문제를 해결한 경험" 소재

---

## 인프라 · 배포

### Argo CD 앱이 Unknown 상태로 아무것도 배포하지 않음 (2026-10-13)

- **증상:** Application 등록 후 `SYNC STATUS: Unknown`, 파드 0개
- **확인:** `kubectl -n argocd get application zoolog -o jsonpath='{.status.conditions}'` → `InvalidSpecError: Application referencing project default which does not exist`
- **원인:** `default` AppProject는 웹 화면 담당인 `argocd-server`가 시작할 때 만듦. 메모리를 아끼려고 고른 core 설치에는 `argocd-server`가 없어 프로젝트가 생기지 않음
- **해결:** `default` AppProject를 YAML로 직접 생성 → 즉시 Synced/Healthy. 서버 준비 문서에 단계 추가
- **배운 점:** 상태가 Unknown이면 추측하지 말고 `.status.conditions`의 메시지부터 확인. 경량 설치는 빠진 구성 요소가 하던 일을 따로 챙겨야 함

### 정상 동작인데 Warning 이벤트가 계속 쌓임 (2026-10-13)

- **증상:** `kubectl describe pod`의 Events에 `FailedToRetrieveImagePullSecret ... (ghcr)` 경고가 54분 동안 49번
- **원인:** 이미지를 공개로 바꿔 내려받기용 Secret `ghcr`를 만들지 않았는데, 매니페스트에는 `imagePullSecrets: ghcr` 참조가 남아 있음. 공개 이미지라 받기는 성공하지만 kubelet이 매번 경고를 남김
- **해결:** 공개 이미지에 맞춰 `imagePullSecrets` 제거
- **같이 확인한 것:** 같은 Events의 `Startup probe failed: connection refused` 4회는 Spring이 켜지는 약 20초 동안 포트가 아직 닫혀 있어서 생긴 예상된 경고(검사 5초 간격, 최대 24회 허용). Warning이라고 모두 장애는 아님
- **배운 점:** 무해한 경고를 방치하면 진짜 경고가 묻힘. 경고는 원인을 확인해 고치거나 왜 무해한지 기록

### 프록시 뒤에서 Google 로그인 콜백 주소가 http로 만들어지는 문제 예방 (2026-10-12)

- **상황:** Caddy가 HTTPS를 끝내고 Spring에는 http로 전달. Spring은 요청이 http라고 판단해 콜백 주소를 `http://`로 만들고, Google 콘솔에 등록한 `https://` 주소와 달라 로그인 실패하는 구조
- **해결:** 운영 프로필에 `server.forward-headers-strategy: native` → Caddy가 붙이는 `X-Forwarded-Proto: https`를 신뢰. 세션 쿠키 `secure: true`
- **검증:** 배포 후 `/oauth2/authorization/google` 응답의 `redirect_uri`가 `https://zoolog.site/...`인지 확인
- **배운 점:** 리버스 프록시 뒤 애플리케이션은 원래 요청의 프로토콜·호스트를 헤더로 전달받아야 함

### 개발 서버 화면이 무한 로딩 (Vite + VS Code 포트 포워딩)

- **원인:** Vite가 `localhost`를 IPv6(`::1`)로 열었는데 VS Code 포트 포워딩이 IPv6를 지원하지 않음
- **해결:** `vite.config.ts`에 `server.host: '127.0.0.1'` (Vite Troubleshooting 문서)

### 개발 중 Google 콜백이 `localhost:8080`으로 만들어짐

- **원인:** Vite 프록시 문자열 단축형이 `changeOrigin: true`처럼 Host 헤더를 8080으로 바꿈 → Spring이 콜백 주소를 8080 기준으로 생성
- **해결:** `/oauth2`, `/login/oauth2` 프록시에 `changeOrigin: false`

### 없는 글 조회가 404가 아니라 403으로 응답

- **원인:** 404 응답을 만들기 위해 서블릿이 `/error`로 다시 보내는(ERROR 디스패치) 단계가 Spring Security에 막힘
- **해결:** `SecurityConfig` 첫 규칙으로 ERROR 디스패치 `permitAll`

## 화면

### 큰 제목의 g·y 아래 획이 잘림

- **원인:** 글자 올림 효과(`RollText`)가 `overflow: hidden`이고 제목 줄 높이가 1이라 글자 아래 부분이 칸 밖으로 나감
- **해결:** 글자 칸 위아래에 `padding-block: 0.2em` + 같은 크기의 음수 margin(배치는 그대로, 잘리는 영역만 확장)
- **배운 점:** 코드로는 멀쩡해 보여도 실제 화면을 캡처해 확인해야 발견되는 문제 → Playwright로 화면 캡처 검증 습관

### 좁은 화면에서 날짜·시각 입력 칸이 카드 밖으로 넘침 (2026-10-13)

- **증상:** 일정 수정 칸을 휴대폰 폭(390px)에서 열면 입력 칸 오른쪽이 카드 밖으로 잘림
- **원인:** grid · flex 항목의 기본 `min-width: auto`가 내용의 최소 폭을 지키는데, 날짜·시각 입력 칸은 브라우저가 정한 최소 폭이 있어 칸이 줄어들지 않음
- **해결:** 입력 칸을 감싼 항목과 입력 칸에 `min-width: 0`, `max-width: 100%`
- **검증:** Playwright로 390px 화면에서 카드 오른쪽을 넘는 입력 칸 수를 세어 0개 확인
- **배운 점:** flex · grid 안에서 줄어들지 않는 요소는 `min-width: auto`부터 의심

### 느린 환경에서 프리로더 채움 애니메이션이 보이지 않음

- **원인:** 데이터·글꼴을 받는 동안 애니메이션이 이미 끝나 버림
- **해결:** 단계를 wait(준비 대기) → fill → move → fade로 나누고, 채움은 준비가 끝난 뒤 시작

### 프리로더가 스크롤을 잠갔다 풀 때 화면이 옆으로 밀림

- **원인:** 스크롤바가 사라졌다 생기며 폭이 바뀜
- **해결:** `:root { scrollbar-gutter: stable }`로 스크롤바 자리를 항상 확보
