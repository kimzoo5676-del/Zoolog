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

### 화면 전환 뒤 카드가 한 번 더 떠오름 (2026-10-13)

- **증상:** 주제 메뉴를 누르면 카드가 나타난 뒤 전환이 끝나는 순간 다시 한 번 떠오르는 느낌
- **원인:** 칸의 등장 효과(CSS animation)를 전환 중에만 `:root:active-view-transition` 선택자로 끄거나 늦췄는데, 전환이 끝나 선택자가 풀리면 animation 값이 바뀌어 효과가 처음부터 다시 재생됨
- **해결:** 전환 중에 그려졌는지를 처음 그릴 때 한 번만 판단해 클래스로 고정(`useEnteredInTransition`)
- **검증:** 전환이 끝난 뒤 requestAnimationFrame마다 칸의 투명도를 재서 1 아래로 떨어지지 않음을 확인(6개 경로)
- **배운 점:** 상태에 따라 바뀌는 선택자로 animation을 켜고 끄면 재시작됨. 등장 효과 조건은 마운트 시점에 고정

### 화면 전환이 빠진 진입 지점 찾기와 뒤로 가기 제목 복귀 (2026-10-13)

- **방법:** 모든 이동 지점을 Playwright로 자동 클릭하고 `document.startViewTransition`을 감싸 호출 수를 세는 점검 스크립트(33개 경로, 데스크톱·휴대폰)
- **발견:** 로고, 글쓰기, 글 화면의 주제 링크, 수정·나가기·저장, 404 홈 링크에 전환이 없었음 → 모두 추가
- **뒤로 가기:** 글 제목이 카드로 돌아가지 않고 제자리에서 사라짐. React Router `useViewTransitionState(to)`는 도착지만 보므로 뒤로 가기에서 출발한 글 주소는 false → 새 화면을 그리는 순간(전환 콜백 안) 아직 문서에 남아 있는 떠나는 글 제목(`data-post-id`)을 보고 같은 글의 카드에 이름을 줌
- **배운 점:** 전환은 "들어가는 길"만 만들기 쉬워서 돌아오는 길·덜 쓰는 링크를 자동으로 전수 점검해야 빠짐이 없음

### 화면 전환 이름이 겹쳐 공유 요소 전환이 통째로 건너뛰어짐 (2026-10-13)

- **증상:** 하위 주제 칸을 누르면 제목 이동 없이 화면만 바뀌고 콘솔에 `Unexpected duplicate view-transition-name: category-title`
- **원인:** 누른 칸 이름과 현재 화면 제목에 같은 이름을 주고, 떠나는 화면 제목만 이름을 빼려고 `useViewTransitionState(현재 주소)`를 썼는데, 이 훅은 출발 주소와 도착 주소 모두에서 true라 떠나는 화면에 같은 이름이 두 개 생김
- **해결:** 이름을 주제 id별(`cat-80`)로 바꾸고 모양은 `view-transition-class`로 한 번에 지정 → 한 화면 안에서는 항상 유일, 칸 이름(cat-80) ↔ 다음 화면 제목(cat-80)이 저절로 짝이 됨. 뒤로 가기에서도 제목이 칸으로 되돌아감
- **배운 점:** 공유 요소 전환 이름은 "같은 대상이면 같은 이름, 다른 대상이면 다른 이름"이 되도록 데이터 id로 짓는 편이 조건 분기보다 안전

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
