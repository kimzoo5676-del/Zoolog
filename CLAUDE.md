# zoolog

개인 일정 비서 + 공개 개발 공부 기록 블로그. 1인 개발, 개인 노트북에서 Tailscale Funnel로 셀프 호스팅(노트북이 켜져 있을 때만 공개, 비상업).
글쓰기와 일정 관리는 소유자만, 방문자는 읽기만 가능.

## 기능 범위

1차
1. 첫 진입 프리로더: 화면 가운데 `Zoolog`의 Z가 진한 러스트로 차오른 뒤 머리글 로고 자리로 이동, 격자선이 제자리에 그어지고 화면이 걷힘 (원래 "쇼릴"로 적었던 항목, 2026-10-12 프리로더로 결정)
2. 로그인: 소유자 1명만 작성 권한
3. 공부 글: 마크다운 원문 저장 + 사진, 주제(category) 분류
4. 방문자 조회: 주제별 목록, 글 상세
5. 일정 등록: 주로 반복 일정 (예: 06:00 뉴스 스크랩 메일, 07:00 AWS-SAA 공부, 18:00 토익스피킹 공부)
6. 완료 체크 → 일정 보드에 기록 표시

2차
7. Gmail 일정 알림
8. 산업 뉴스 스크랩: 매일 기사 선정 메일 + 코멘트 유도 질문 → 소유자가 1~2문장 코멘트 → "뉴스 스크랩" 글로 게시. 공개 글에는 제목 + 원문 링크 + 본인 코멘트만 (기사 본문 복제 금지, 저작권). 네이버 뉴스 검색 API 예정. 선정 방식, 코멘트 입력 방식, 누락일 처리, 06:00 발송 시 노트북 절전 문제는 미정

## 스택 (확인된 버전)

- 백엔드: Spring Boot 4.1.1 (Spring Framework 7.0.9, Hibernate 7.4.5, Tomcat 11), Java 25, Gradle 9.7.1 (Groovy DSL)
- DB: PostgreSQL 18.6, Flyway 마이그레이션
- 파일 저장소: SeaweedFS 4.45 (`weed mini`, S3 API 포트 8333, 버킷 `zoolog`). MinIO는 저장소 아카이브로 제외
- 프론트: React 19.3.0 (package-lock 기준), TypeScript ~6.0.2, Vite 8.3.4, ESLint 10, Node 24
- 라우팅: React Router 8.4.0 Framework 모드 + SPA 모드(`ssr: false`). v8부터 `react-router-dom` 없음, `react-router` 하나로 import
- 마크다운: react-markdown 10.1.0 + remark-gfm 4.0.1 (표, 취소선, 체크리스트, 자동 링크)
- 글꼴: Pretendard 1.3.9 (npm, 가변 + 동적 서브셋)

## 개발 환경

- Windows 11 + WSL2(Ubuntu) + Docker Desktop + VS Code Dev Containers
- `.devcontainer/compose.yaml` 서비스: `app`(작업 컨테이너), `db`(postgres:18), `storage`(seaweedfs)
- 컨테이너 안 저장소 경로 `/workspaces/zoolog`, DB 주소 `db:5432`
- `db`, `storage`는 `ports:` 없음(외부 비공개). `forwardPorts`는 5173(Vite)만
- 비밀값은 `.devcontainer/.env` (gitignore 대상): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`. 키 목록은 `.env.example`에 커밋
- `.env` 내용, 비밀번호, Spring 기동 로그의 `Using generated security password` 값은 출력·커밋·공유 금지
- 지금까지 SQL 직접 실행은 Windows PowerShell에서: `docker exec zoolog_devcontainer-db-1 psql -U zoolog -d zoolog -c "..."`
- 컨테이너 안 DB 직접 접속: psql 클라이언트가 기본 이미지에 없을 수 있음. 필요 시 `sudo apt-get install -y postgresql-client` 후 `PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB"`. 환경 변수는 compose의 `env_file`로 app 컨테이너에 주입됨, 값 출력 금지. apt 설치분은 컨테이너 재빌드 시 사라짐
- 맥북을 나중에 개발 기기로 추가 예정 (Dev Containers로 같은 환경 재현)

## 명령

```bash
# 백엔드 (bootRun은 코드 변경 자동 반영 없음, 변경 후 재시작)
cd /workspaces/zoolog/backend
./gradlew bootRun
./gradlew bootRun --args='--logging.level.org.hibernate.SQL=debug'   # SQL 로그 확인용
./gradlew test
./gradlew test --tests com.zoolog.post.PostRepositoryTest

# 프론트 (브라우저: http://localhost:5173)
cd /workspaces/zoolog/frontend
npm run dev
npm run lint
npm run typecheck   # 라우트 타입 생성(typegen) + tsc
npm run build       # 결과물 build/client (SPA, 모든 경로를 index.html로 응답하도록 서버 설정 필요)
```

## 백엔드 규칙

- 패키지: 기능별 `com.zoolog.<기능>` (`category`, `post`), 공통은 `com.zoolog.global` (`config`, `entity`)
- 계층: Controller → Service → Repository. 생성자 주입. DTO는 `record` + `static from(Entity)`
- 서비스: 클래스에 `@Transactional(readOnly = true)`, 쓰기 메서드만 `@Transactional`
- 엔티티: `BaseTimeEntity` 상속(JPA Auditing으로 `createdAt`, `updatedAt` 자동, `Instant`), `@GeneratedValue(strategy = GenerationType.IDENTITY)`, `protected` 기본 생성자, setter 없음
- 연관관계: `@ManyToOne(fetch = FetchType.LAZY, optional = false)` 기본
- N+1 방지: 연관 객체가 필요한 조회는 JPQL `join fetch` 사용 (`PostRepository` 참고). DTO 변환은 트랜잭션 안(서비스)에서 완료 (`open-in-view: false`)
- 스키마는 Flyway가 소유: `src/main/resources/db/migration/V<번호>__<이름>.sql`. 적용된 마이그레이션 수정 금지, 변경은 새 버전 파일로. `ddl-auto: validate`
- 컬럼 규칙: 시각 `TIMESTAMPTZ NOT NULL`, PK `BIGINT GENERATED ALWAYS AS IDENTITY`, FK마다 인덱스, 값 범위는 CHECK 제약
- V1에 이미 있는 테이블: `member`, `category`, `post`, `post_image`, `schedule`, `schedule_record`. 엔티티 구현 완료: `Category`, `Post`
- 없는 리소스: 현재 `ResponseStatusException(HttpStatus.NOT_FOUND)`. 오류 응답 형식 통일 시 `@RestControllerAdvice` 검토
- 테스트: `@SpringBootTest` + `@Transactional`(개발 DB 사용, 끝나면 롤백), `@DisplayName`은 한국어 문장, 저장 검증은 `flush()` → `clear()` → 재조회. 롤백으로 생기는 id 빈 번호는 정상

## 보안 (현재 상태)

- `SecurityConfig` 규칙 순서: ERROR 디스패치 `permitAll` → GET `/api/categories`, `/api/categories/**`, `/api/posts`, `/api/posts/**` `permitAll` → `anyRequest().authenticated()`
- ERROR 디스패치 허용은 필수: 없으면 404 같은 오류 응답이 `/error` 단계에서 막혀 403으로 바뀜
- 로그인 미구현. CSRF 기본값 켜짐, 세션/토큰 방식은 로그인 단계에서 결정
- SeaweedFS(S3)는 절대 Funnel로 외부 공개 금지. 이미지는 백엔드를 거쳐 업로드
- 이미지 제공: SeaweedFS는 외부 비공개라 presigned URL은 브라우저에서 접근 불가. 프론트에 주는 이미지 URL은 백엔드(또는 같은 도메인 프록시) 경로로 설계
- 비로그인 요청이 거절되면 Spring Security가 원래 요청을 세션에 저장해 JSESSIONID 발급. 세션 정책은 로그인 단계에서 결정

## 현재 API

- `GET /api/categories`: 주제 목록, 이름순 (DB 정렬 규칙 en_US.utf8 그대로 유지하기로 결정)
- `GET /api/posts?category={slug}`: 글 목록, 최신순(`createdAt desc, id desc`), 본문 제외. `category` 생략 시 전체, 없는 slug는 `[]`
- `GET /api/posts/{id}`: 글 상세(본문 마크다운 포함), 없으면 404
- 시각 필드는 ISO-8601 UTC 문자열 (예: `2026-10-12T04:05:29.717131Z`)

## 프론트 규칙

- `vite.config.ts`의 `server.host: '127.0.0.1'` 삭제 금지: VS Code 포트 포워딩이 IPv6를 지원하지 않아, 없으면 브라우저가 무한 로딩 (Vite Troubleshooting 문서)
- 개발 중 API는 Vite 프록시(`/api` → `http://localhost:8080`)로 호출, CORS 설정 불필요
- API 함수는 `src/api/*.ts`, 타입은 백엔드 DTO와 같은 모양, `response.ok` 검사 후 오류 throw
- 라우트 등록은 `src/routes.ts`, 라우트 모듈은 `src/routes/*.tsx`, 문서 뼈대(`<html>`)는 `src/root.tsx`의 `Layout` (`index.html`, `main.tsx` 없음). `appDirectory: 'src'`
- 라우트 타입은 `import type { Route } from './+types/<파일명>'`. 생성 위치 `.react-router/`(gitignore), `npm run dev`/`typecheck`가 생성
- 데이터 조회는 라우트 모듈의 `clientLoader`, `request.signal`을 API 함수에 전달(다른 화면으로 이동하면 요청 취소). SPA 모드라 서버 `loader`는 사용 안 함. TanStack Query는 화면이 늘어나면 도입 검토
- 없는 리소스: `clientLoader`에서 `throw data('메시지', { status: 404 })` → 라우트 `ErrorBoundary`에서 `RouteError`로 표시. 오류 화면도 레이아웃(머리글, 주제 메뉴) 안에 표시하려면 라우트마다 `ErrorBoundary` export
- 링크 경로는 `href('/posts/:postId', { postId })`로 생성 (경로·파라미터 타입 검사)
- 페이지 제목은 React 19 `<title>` 요소를 라우트 컴포넌트에 직접 렌더링 (`meta` export 대신, React Router 문서 권장)
- 글 본문은 마크다운 원문 저장, 화면에서는 `MarkdownContent`(react-markdown)로 렌더링. 원문 HTML은 글자로 이스케이프되는 기본값 유지, HTML 허용(`rehype-raw`)이 필요하면 `rehype-sanitize` 함께 적용
- 화면 확인은 사용자가 Windows 브라우저(http://localhost:5173)에서 진행. UI 변경 후에는 확인할 항목을 정리해 요청
- 프리로더(`components/Preloader.tsx`): 홈 화면(`/`, `/posts`)을 불러올 때마다 재생 (2026-10-12 소유자 결정). `root.tsx` `<head>`의 인라인 스크립트(`INTRO_SCRIPT`)가 `<html data-intro="play|skip">`을 정함. 다른 주소로 바로 들어오거나 움직임 줄이기 설정이면 skip
- 프리로더 단계: wait(차콜 로고, 화면 데이터·글꼴 준비 대기, JS 전에는 `HydrateFallback`의 `PreloaderStage`) → fill(Z 채움 1.3초) → move(로고 이동 FLIP + 선 그리기) → fade. 채움은 준비가 끝난 뒤 시작해야 느린 환경에서도 보임
- 프리로더 격자선은 좌표를 적지 않고 `.site-shell` 안 요소의 테두리(2px 이하)를 재서 그림 (`utils/gridLines.ts`). 레이아웃을 바꿔도 프리로더 수정 불필요
- `:root { scrollbar-gutter: stable }`: 프리로더가 스크롤을 잠갔다 풀 때 화면이 옆으로 밀리지 않도록 유지

## 디자인

색상 토큰 (`src/index.css`의 `:root`, 역할 이름 유지)

| 변수 | 값 | 용도 | 대비 |
|---|---|---|---|
| `--color-bg` | #becbb3 세이지 | 배경 | 기준 |
| `--color-text` | #252a27 차콜 | 본문, 포커스 테두리 | 세이지 대비 8.60:1 |
| `--color-accent` | #bd573d 러스트 | 장식(막대, 망점) | 흰 글자 4.57:1, 세이지 대비 2.70:1 |
| `--color-accent-strong` | #853d2b 진한 러스트 | 격자선, 링크 밑줄, 로고 `Z`, 활성 메뉴 칸·목록 번호 칸(세이지 글자) | 세이지 대비 4.59:1 |
| `--color-on-accent` | #ffffff | 러스트 위 글자 | 4.57:1 |
| `--color-surface` | #b2bea8 (세이지 + 차콜 8%) | 코드 배경 | 차콜 글자 7.52:1, 진한 러스트 글자 4.01:1이라 사용 금지 |
| `--color-line` | #889382 (세이지 + 차콜 35%) | 구분선, 표 테두리 (장식 전용) | 세이지 대비 1.89:1 |

- 러스트(#bd573d)는 세이지 위 글자나 유일한 상태 표시(링크 밑줄, 선택 메뉴)에 사용 금지 (WCAG 1.4.3, 1.4.11)
- 큰 글자(24px 이상, 굵게 18.66px 이상)만 러스트 비주얼 위에 겹치기 허용 (차콜/러스트 3.19:1)
- 글꼴: Pretendard 한 가족. 제목 900, 본문 400. `word-break: keep-all`, `overflow-wrap: break-word`
- 레퍼런스 느낌: 포스터형. 화면을 채우는 아주 굵은 차콜 제목(글자 자체가 그래픽), 러스트 단색(듀오톤, 망점 질감) 비주얼, 얇은 러스트 막대, 그림자·그라데이션 없는 평면 색면, 넓은 세이지 여백, 제목이 이미지 위에 겹침
- 강한 표현은 프리로더와 큰 제목에 집중, 글 목록·본문은 차분하고 읽기 우선
- 레퍼런스 포스터 이미지와 구성은 복제 금지, 비주얼은 직접 제작
- 접근성: `:focus-visible` 차콜 2px 테두리 유지, 프리로더와 글자 올림 효과는 `prefers-reduced-motion`이면 생략
- 화면 문구: 소개 문장, 태그라인 같은 꾸밈 문구는 임의로 넣지 않음. 문구는 소유자가 결정
- 레이아웃 참고: https://mijobello.com (격자선, 칸 구성, 작은 대문자 라벨). 화면 가운데 기둥(`site-shell`)을 진한 러스트 1px 격자선으로 나눔: 머리글(로고 칸 | 메뉴 칸), 페이지 머리 칸, 목록 행(번호 칸 | 제목·정보 칸), 글 정보 칸
- 글자는 모두 차콜 (로고, 제목, 라벨 포함). 진한 러스트 글자는 써 보고 제외 (2026-10-12 소유자 결정)
- 페이지 제목은 메뉴 이름 그대로 (예: `전체`, `전체 글` 아님)
- 로고는 `Zoolog` (첫 글자 `Z`만 진한 러스트로 현재 메뉴 칸·목록 번호 칸과 같은 색, 링크에 `aria-label="Zoolog"`로 한 단어로 읽힘)
- 러스트 사용처: 짧은 막대(글 제목 위, 본문 소제목 앞, 인용, 코드 블록 왼쪽), 글 상세 망점 띠(`Halftone`, SVG로 직접 생성)
- 목록 번호는 현재 메뉴 칸과 같은 진한 러스트 칸 + 세이지 글자, 항상 표시
- 활성 메뉴는 진한 러스트 칸 + 세이지 글자 (4.59:1). 버튼은 얇은 진한 러스트 테두리, 마우스를 올리면 채움
- 목록 제목, 주제 메뉴에 마우스를 올리면 글자가 위로 빠지고 아래에서 같은 글자가 올라옴 (`RollText`, 감싸는 요소에 `roll-trigger` 클래스, 0.45초 `cubic-bezier(0.65, 0, 0.35, 1)`). 메뉴는 동시에 진한 러스트 칸 + 세이지 글자로 바뀜. 움직임 줄이기 설정이면 글자 올림 없이 목록은 밑줄
- 써 보고 제외한 것 (소유자 판단): 망점 글자를 겹친 포스터형 페이지 머리, 로고 옆 러스트 커서 막대, 바닥글(러스트 면, mijobello식 포함)

## Git

- Conventional Commits, 한국어 메시지: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
- `style`은 코드 서식 정리 전용 (CSS 디자인 변경은 `feat`)
- 이유가 필요한 변경은 본문에 기록: `git commit -m "제목" -m "이유"`
- 기능 조각 하나가 테스트·lint 통과 후 커밋. `package-lock.json`, `devcontainer-lock.json` 커밋 대상. push는 요청 시에만

## 다음 작업 (순서)

1. (완료) 프론트: React Router로 주제별 글 목록, 글 상세 화면 + 마크다운 렌더링
2. 로그인(`member`, 세션/토큰 결정, CSRF) → 글 작성·수정·삭제(소유자 전용)
3. 이미지 업로드 (SeaweedFS S3, `post_image.object_key`)
4. 일정(`schedule`), 완료 기록(`schedule_record`), 일정 보드
5. (완료) 첫 진입 프리로더
6. 2차 기능 (Gmail 알림, 뉴스 스크랩)
7. 배포: Tailscale Funnel (443/8443/10000). Spring이 React 빌드를 정적 제공 vs Nginx 앞단은 배포 시 결정. Tailscale Funnel이 HTTPS 인증서를 자동 처리하므로 Caddy의 자동 HTTPS는 중복

## 열린 이슈

- 브라우저 배경이 세이지가 아닌 흰색으로 보인 적 있음, 원인 미확인. 브라우저 콘솔에서 `getComputedStyle(document.body).backgroundColor`가 `rgb(190, 203, 179)`인지 확인 필요
