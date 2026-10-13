# zoolog

개인 일정 비서 + 공개 개발 공부 기록 블로그. 1인 개발, AWS Lightsail 서버 1대에서 상시 운영(비상업). 노트북은 개발 전용.
글쓰기와 일정 관리는 소유자만, 방문자는 읽기만 가능.

## 기능 범위

1차
1. 첫 진입 프리로더: 화면 가운데 `Zoolog`의 Z가 진한 러스트로 차오른 뒤 머리글 로고 자리로 이동, 격자선이 제자리에 그어지고 화면이 걷힘 (원래 "쇼릴"로 적었던 항목, 2026-10-12 프리로더로 결정)
2. 로그인: Google 로그인(OIDC), 소유자 1명만 작성 권한
3. 공부 글: 마크다운 원문 저장 + 사진, 주제(category) 3단계 분류 (예: Cloud Engineer > AWS-SAA > 컴퓨팅)
4. 방문자 조회: 주제별 목록, 글 상세
5. Streak (2026-10-13 소유자 결정으로 반복 일정 등록을 대체): 큰 주제마다 한 달 달력이 저절로 생기고, 글을 쓴 날이 하위 주제 색으로 칠해짐
6. (삭제) 일정 완료 체크·일정 보드 화면. 일정 알림 메일은 화면 없이 받을 예정(2차 Gmail, 무엇을 알릴지 설계 필요)

2차
7. Gmail 일정 알림
8. 산업 뉴스 스크랩: 매일 기사 선정 메일 + 코멘트 유도 질문 → 소유자가 1~2문장 코멘트 → "뉴스 스크랩" 글로 게시. 공개 글에는 제목 + 원문 링크 + 본인 코멘트만 (기사 본문 복제 금지, 저작권). 네이버 뉴스 검색 API 예정. 선정 방식, 코멘트 입력 방식, 누락일 처리는 미정 (06:00 발송 시 노트북 절전 문제는 상시 운영 서버로 해결)

## 스택 (확인된 버전)

- 백엔드: Spring Boot 4.1.1 (Spring Framework 7.0.9, Hibernate 7.4.5, Tomcat 11), Java 25, Gradle 9.7.1 (Groovy DSL)
- DB: PostgreSQL 18.6, Flyway 마이그레이션
- 파일 저장소: SeaweedFS 4.45 (`weed mini`, S3 API 포트 8333, 버킷 `zoolog`). MinIO는 저장소 아카이브로 제외
- S3 클라이언트: AWS SDK for Java v2 (BOM 2.55.14, 2026-10-12 결정). `StorageConfig`가 endpoint `http://storage:8333`(path-style), 환경 변수 접근 키 사용. 버킷이 없으면 서버 시작 시 생성
- 프론트: React 19.3.0 (package-lock 기준), TypeScript ~6.0.2, Vite 8.3.4, ESLint 10, Node 24
- 라우팅: React Router 8.4.0 Framework 모드 + SPA 모드(`ssr: false`). v8부터 `react-router-dom` 없음, `react-router` 하나로 import
- 마크다운: react-markdown 10.1.0 + remark-gfm 4.0.1 (표, 취소선, 체크리스트, 자동 링크)
- 글꼴: Pretendard 1.3.9 (npm, 가변 + 동적 서브셋)

## 개발 환경

- Windows 11 + WSL2(Ubuntu) + Docker Desktop + VS Code Dev Containers (윈도우 노트북은 12월 초 반납 예정)
- `.devcontainer/compose.yaml` 서비스: `app`(작업 컨테이너), `db`(postgres:18), `storage`(seaweedfs)
- 컨테이너 안 저장소 경로 `/workspaces/zoolog`, DB 주소 `db:5432`
- Claude Code 로그인·설정 유지: named volume `claude-config` → `/home/vscode/.claude`, `CLAUDE_CONFIG_DIR`로 `.claude.json`도 그 안에 저장. 볼륨 소유자는 `postCreateCommand`의 `chown`으로 맞춤. 볼륨 삭제 시 재로그인 필요
- `db`, `storage`는 `ports:` 없음(외부 비공개). `forwardPorts`는 5173(Vite)만
- 비밀값은 `.devcontainer/.env` (gitignore 대상): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OWNER_EMAIL`. 키 목록은 `.env.example`에 커밋. `.env` 변경은 컨테이너를 다시 만들어야(Rebuild) 반영
- 테스트는 `build.gradle`의 `test` 작업이 Google 관련 환경 변수를 가짜 값으로 채움 (Google과 통신 안 함)
- `.env` 내용, 비밀번호, Google 클라이언트 시크릿은 출력·커밋·공유 금지
- 지금까지 SQL 직접 실행은 Windows PowerShell에서: `docker exec zoolog_devcontainer-db-1 psql -U zoolog -d zoolog -c "..."`
- 컨테이너 안 DB 직접 접속: psql 클라이언트가 기본 이미지에 없을 수 있음. 필요 시 `sudo apt-get install -y postgresql-client` 후 `PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB"`. 환경 변수는 compose의 `env_file`로 app 컨테이너에 주입됨, 값 출력 금지. apt 설치분은 컨테이너 재빌드 시 사라짐
- 노트북은 개발 전용 (운영은 Lightsail). 윈도우 반납 후 맥북으로 이전, Dev Containers로 같은 환경 재현

## 운영 (배포·호스팅, 2026-10-12 결정)

노트북 + Tailscale Funnel 셀프 호스팅에서 AWS Lightsail로 변경 (노트북이 꺼지면 사이트·06:00 메일이 멈추는 문제 해결)

- 서버: Lightsail 서울 리전(ap-northeast-2) Linux $12 플랜(2GB 메모리, 2 vCPU, SSD 60GB) 1대 + 고정 IP
- 주소: `zoolog.site`(가비아, 네임서버 가비아 기본값, A 레코드 `@`만. `www`는 Caddyfile에 없어 넣지 않음) → 고정 IP. HTTPS 인증서는 Caddy가 Let's Encrypt로 자동 발급·갱신
- 서버 정보(IP, Tailscale 이름 등)와 진행 기록은 `NOTES.local.md`(Git 제외)
- Argo CD core 설치에는 `argocd-server`가 없어 `default` AppProject를 직접 만들어야 함 (`deploy/README.md`, 없으면 앱이 `InvalidSpecError`로 Unknown)
- 구성: k3s(1대) + Argo CD core로 GitOps 배포 (2026-10-12 소유자 결정, 처음 정한 운영용 Docker Compose 대체). 기본 Traefik은 끄고(`--disable traefik`) Caddy가 HTTPS·화면 제공. 외부 공개는 Caddy의 80/443(LoadBalancer, k3s ServiceLB)만, PostgreSQL·SeaweedFS는 ClusterIP(클러스터 안에서만)
- 흐름: `main` push → GitHub Actions(`.github/workflows/deploy.yml`: 백엔드 테스트(서비스 컨테이너로 PostgreSQL·SeaweedFS) → 프론트 lint·typecheck → 이미지 2개 linux/amd64 빌드·GHCR 업로드(태그 = 커밋 SHA) → `deploy/k8s/kustomization.yaml` 이미지 태그를 yq로 바꿔 커밋) → Argo CD Application(`deploy/argocd/zoolog.yaml`, 자동 sync·prune·selfHeal)이 서버에 반영. 되돌리기는 태그 커밋 `git revert`
- 설정 위치: `deploy/k8s/`(kustomize: postgres·seaweedfs StatefulSet + PVC, backend·web Deployment, 백업 CronJob), `backend/Dockerfile`(jar는 CI에서 빌드, temurin 25 JRE), `frontend/Dockerfile`(node 24 빌드 → caddy 2.11), `frontend/Caddyfile`, 서버 준비 절차 `deploy/README.md`
- 비밀값: k8s Secret `zoolog-env`(키 목록 `deploy/zoolog-env.example`, 개발 키 + `DOMAIN`, `ACME_EMAIL`), 이미지는 공개라 내려받기 Secret 없음(`imagePullSecrets`도 없음. 없는 Secret을 참조하면 kubelet이 `FailedToRetrieveImagePullSecret` 경고를 계속 남겨 제거, 2026-10-13). Git 커밋 금지, 서버에서 한 번 직접 만듦
- 메모리(2GB): 각 컨테이너 limit(backend 640Mi, postgres·seaweedfs 256Mi, web 128Mi), 서버 스왑 2GB. web(Caddy)은 무중단 `RollingUpdate`(maxSurge 1, maxUnavailable 0, readiness tcp 443, preStop sleep 5, Caddy `grace_period 10s`, 2026-10-13). backend는 `Recreate`(옛 파드를 먼저 내림, 배포 중 약 1분 API 중단): 메모리를 관찰한 뒤 무중단 여부 결정(2026-10-13 소유자 결정, 필요 시 Actuator readiness·preStop 추가, 세션은 파드 메모리라 교체 시 소유자 재로그인, 옛·새 버전 동시 실행 대비 마이그레이션 하위 호환). 부족하면 $24(4GB) 플랜 검토
- 백엔드 운영 프로필 `prod`(`application-prod.yaml`): `forward-headers-strategy: native`(Caddy의 X-Forwarded-Proto로 https 인식, 없으면 Google 콜백이 http), 세션 쿠키 secure, graceful shutdown. DB 주소 `DB_HOST`(개발 기본 `db`), 저장소 `S3_ENDPOINT`
- 검증(이 개발 컨테이너에는 Docker·kubectl 없음): scratchpad에 내려받은 `actionlint`, `kustomize build` + `kubeconform -strict`, `caddy validate`로 형식 검사
- SSH: Tailscale로만 접속, 공개 SSH 포트(22)는 Lightsail 방화벽에서 닫음
- 빌드는 서버 밖(노트북 또는 GitHub Actions)에서, 서버는 실행만 (Lightsail은 버스트형 CPU라 빌드로 CPU 크레딧을 쓰지 않도록)
- 백업: Lightsail 자동 스냅샷 + `pg_dump` CronJob(매일 03:00 Asia/Seoul, 서버 `/var/backups/zoolog`, 14일 보관)
- 메일 발송: Gmail SMTP 587(STARTTLS) 또는 465(SSL). Lightsail은 25번 포트가 기본 차단

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

- 패키지: 기능별 `com.zoolog.<기능>` (`category`, `post`, `member`, `auth`), 공통은 `com.zoolog.global` (`config`, `entity`)
- 계층: Controller → Service → Repository. 생성자 주입. DTO는 `record` + `static from(Entity)`
- 서비스: 클래스에 `@Transactional(readOnly = true)`, 쓰기 메서드만 `@Transactional`
- 엔티티: `BaseTimeEntity` 상속(JPA Auditing으로 `createdAt`, `updatedAt` 자동, `Instant`), `@GeneratedValue(strategy = GenerationType.IDENTITY)`, `protected` 기본 생성자, setter 없음
- 연관관계: `@ManyToOne(fetch = FetchType.LAZY, optional = false)` 기본
- N+1 방지: 연관 객체가 필요한 조회는 JPQL `join fetch` 사용 (`PostRepository` 참고). DTO 변환은 트랜잭션 안(서비스)에서 완료 (`open-in-view: false`)
- 스키마는 Flyway가 소유: `src/main/resources/db/migration/V<번호>__<이름>.sql`. 적용된 마이그레이션 수정 금지, 변경은 새 버전 파일로. `ddl-auto: validate`
- 컬럼 규칙: 시각 `TIMESTAMPTZ NOT NULL`, PK `BIGINT GENERATED ALWAYS AS IDENTITY`, FK마다 인덱스, 값 범위는 CHECK 제약
- V1에 이미 있는 테이블: `member`, `category`, `post`, `post_image`, `schedule`, `schedule_record`. V2: `member`를 Google 로그인용(`google_sub` UNIQUE, `email`)으로 변경. V3: `category.parent_id`(NULL이면 큰 주제). V4: `post_image.post_id` NULL 허용(작성 중 업로드), `content_type` 추가. 깊이 제한은 `CategoryService.MAX_DEPTH = 3`(2026-10-12 2단계 → 3단계, V3 파일 주석의 "2단계"는 적용된 마이그레이션이라 수정하지 않음). 엔티티 구현 완료: `Category`, `Post`, `Member`, `PostImage`, `Schedule`, `ScheduleRecord`
- 오류 응답: `spring.mvc.problemdetails.enabled: true`로 RFC 9457 ProblemDetail JSON (`status`, `title`, `detail`, `instance`). `ResponseStatusException(상태, "이유")`의 이유가 `detail`로 전달되어 화면에 그대로 표시. 입력값 검증 실패 문구는 `messages.properties`(`입력값을 확인해 주세요`)
- 글은 하위 주제(2단계 이상)에만 쓸 수 있음 (2026-10-13 소유자 결정, `PostService.getCategory`가 큰 주제면 400 "하위 주제를 골라 주세요"). 편집기 주제 선택도 SUB 줄을 반드시 고름(`선택 안 함`은 SECTION 줄만)
- 상태 코드: 없는 리소스 404, 요청 본문의 잘못된 참조(없는 주제 id) 400, 중복 409
- 테스트: `@SpringBootTest` + `@Transactional`(개발 DB 사용, 끝나면 롤백), `@DisplayName`은 한국어 문장, 저장 검증은 `flush()` → `clear()` → 재조회. 롤백으로 생기는 id 빈 번호는 정상

## 보안 (현재 상태)

- `SecurityConfig` 규칙 순서: ERROR 디스패치 `permitAll` → GET `/api/categories`, `/api/categories/**`, `/api/posts`, `/api/posts/**`, `/api/auth/me`, `/api/images/**`, `/api/schedules/board` `permitAll` → `anyRequest().authenticated()`
- ERROR 디스패치 허용은 필수: 없으면 404 같은 오류 응답이 `/error` 단계에서 막혀 403으로 바뀜
- 로그인: Spring Security `oauth2Login` + Google OIDC, 서버 세션(JSESSIONID 쿠키) 방식 (2026-10-12 결정, JWT 아님). scope `openid, email`
- 흐름: `/oauth2/authorization/google` → Google 동의 화면 → `/login/oauth2/code/google` 콜백 → 성공 `/`, 실패 `/login?error`
- 소유자 판별: `OwnerOidcUserService`가 `email_verified` true + `OWNER_EMAIL` 일치(대소문자 무시)일 때만 로그인 허용, 아니면 로그인 자체 거절. 통과 시 `member`에 `google_sub` 기준 저장·이메일 갱신
- Google Cloud 콘솔 승인된 리디렉션 URI: 개발 `http://localhost:5173/login/oauth2/code/google`. 운영 시 `https://{가비아 도메인}/login/oauth2/code/google` 추가 필요
- CSRF: `csrf.spa()`. `XSRF-TOKEN` 쿠키(JS 읽기 가능) 값을 쓰기 요청의 `X-XSRF-TOKEN` 헤더로 전송 (`src/api/auth.ts`의 `csrfHeaders()`)
- `/api/**` 비로그인 거절은 로그인 페이지 리다이렉트 대신 401. `NullRequestCache`로 거절된 요청을 세션에 저장하지 않음(방문자에게 JSESSIONID 발급 안 함)
- 로그아웃: `POST /api/auth/logout` (CSRF 헤더 필수), 204
- 작성·관리 화면(글 작성·수정, 일정 추가·수정·삭제·체크, 주제 추가)은 소유자 전용, 방문자에게 절대 보이면 안 됨 (2026-10-13 소유자 강조). 두 겹으로 지킴: 화면은 `me`(로그인 확인)·`requireOwner()` 뒤에서만 그림, 서버는 비로그인 쓰기 요청 401. 새 소유자 화면을 만들면 방문자 상태로 렌더링해 버튼·입력 칸이 0개인지 확인
- SeaweedFS(S3)는 절대 외부(인터넷) 공개 금지. 운영에서도 Caddy 80/443만 공개. 이미지는 백엔드를 거쳐 업로드
- 이미지 제공: SeaweedFS는 외부 비공개라 presigned URL은 브라우저에서 접근 불가. 프론트에 주는 이미지 URL은 백엔드(또는 같은 도메인 프록시) 경로로 설계

## 현재 API

- `GET /api/categories`: 주제 목록(평평한 배열, `parentId` 포함), 만든 순서(id 오름차순, 2026-10-12 소유자 결정: 공부 목차 순서대로 만들면 메뉴·그래프·주제 선택에 그 순서가 반영. 이전의 이름순은 폐기). 단계별 트리 묶음은 프론트 `buildCategoryTree`(재귀, `categoryPath`·`descendantIds` 보조)
- `GET /api/posts?category={slug}`: 글 목록(상위 주제 slug면 아래 모든 단계 주제 글 포함), 최신순(`createdAt desc, id desc`), 본문 제외. `category` 생략 시 전체, 없는 slug는 `[]`
- `GET /api/posts/{id}`: 글 상세(본문 마크다운, `categoryId` 포함), 없으면 404
- 소유자 전용(로그인 + CSRF 헤더): `POST /api/posts` 201 + Location, `PUT /api/posts/{id}` 200, `DELETE /api/posts/{id}` 204 (완전 삭제, 2026-10-12 결정). 요청 본문 `{ categoryId, title(200자 이하), content }`
- `POST /api/categories` `{ name(50자 이하), parentId? }` 201. 3단계 주제 아래 추가는 400(3단계 제한). slug(주소용 이름)는 이름에서 자동 생성(소문자, 글자·숫자 외 문자 묶음은 하이픈, 한글 유지. 예: `AWS SAA` → `aws-saa`). 이름·slug 중복 409 (Ghost 방식 참고, 2026-10-12 결정)
- 이미지 (2026-10-12): `POST /api/images`(소유자, multipart `file`, 10MB, JPEG·PNG·GIF·WebP를 파일 서명으로 판별, 아니면 415, 초과 413) → `{ url: "/api/images/{uuid}.{ext}" }`. `GET /api/images/{uuid}.{ext}`(공개, 백엔드가 저장소에서 읽어 전달, `Cache-Control: max-age=31536000, public, immutable`). 원본 그대로 저장(가공 없음). 글 저장 시 본문에 쓰인 이미지 주소를 찾아 `post_image`를 그 글과 연결, 빠지면 연결 해제, 글 삭제 전 연결 해제(FK). 연결 없는 이미지(저장소 파일 포함) 정리는 아직 없음
- 일정 API (2026-10-12, 화면은 2026-10-13 삭제, 백엔드는 2차 Gmail 알림 설계 때 재사용 또는 삭제 결정): `GET /api/schedules/board?weeks=12`(공개), 소유자 전용 `POST /api/schedules`, `PUT`·`DELETE /api/schedules/{id}`, `PUT`·`DELETE /api/schedules/{id}/records/{YYYY-MM-DD}`
- 일정 규칙: "오늘"은 `zoolog.zone: Asia/Seoul` 기준 `Clock` 빈(`ClockConfig`, 테스트는 `@MockitoBean Clock`으로 날짜 고정). 반복 요일은 `repeat_days` "MON,WED,FRI"(`RepeatDaysConverter`). 완료(DONE)만 저장하고 놓침은 계산(스키마의 MISSED는 쓰지 않음). 연속 일수는 해야 했던 날만 세고 오늘 미완료면 어제부터
- `GET /api/auth/me`: 로그인 상태면 200 `{ email }`, 비로그인이면 204 (방문자 화면 콘솔 오류 방지로 401 대신)
- 시각 필드는 ISO-8601 UTC 문자열 (예: `2026-10-12T04:05:29.717131Z`)

## 프론트 규칙

- `vite.config.ts`의 `server.host: '127.0.0.1'` 삭제 금지: VS Code 포트 포워딩이 IPv6를 지원하지 않아, 없으면 브라우저가 무한 로딩 (Vite Troubleshooting 문서)
- 개발 중 API는 Vite 프록시(`/api` → `http://localhost:8080`)로 호출, CORS 설정 불필요
- `/oauth2`, `/login/oauth2` 프록시는 `changeOrigin: false` 필수: 문자열 단축형은 Host를 8080으로 바꿔 Google 콜백 주소가 `localhost:8080`으로 만들어짐
- 로그인 화면 `/login` (메뉴에 링크 없음, 2026-10-12 소유자 결정). 숨은 진입점(`AuthShortcut`, 화면에서 영문 연속 입력, 입력 칸·한글 조합 중·Ctrl/Alt/Cmd 조합 제외): `login` → 비로그인은 Google 로그인으로 바로 이동, 로그인 상태는 `/login`. `logout` → 로그인 상태면 바로 로그아웃. `/login` 화면은 실패 안내·로그아웃용. 모바일은 주소 직접 입력.
- `PointerFocusReset`: 마우스로 링크를 눌러 이동하면 포커스 해제 (남은 포커스에 키 입력 시 포커스 테두리가 보이던 문제). 키보드 이동은 포커스 유지 Google 로그인 버튼은 라우터 `Link`가 아닌 `<a href>` 전체 페이지 이동
- API 함수는 `src/api/*.ts`, 타입은 백엔드 DTO와 같은 모양, `response.ok` 검사 후 오류 throw
- 라우트 등록은 `src/routes.ts`, 라우트 모듈은 `src/routes/*.tsx`, 문서 뼈대(`<html>`)는 `src/root.tsx`의 `Layout` (`index.html`, `main.tsx` 없음). `appDirectory: 'src'`
- 라우트 타입은 `import type { Route } from './+types/<파일명>'`. 생성 위치 `.react-router/`(gitignore), `npm run dev`/`typecheck`가 생성
- 데이터 조회는 라우트 모듈의 `clientLoader`, `request.signal`을 API 함수에 전달(다른 화면으로 이동하면 요청 취소). SPA 모드라 서버 `loader`는 사용 안 함. TanStack Query는 화면이 늘어나면 도입 검토
- 없는 리소스: `clientLoader`에서 `throw data('메시지', { status: 404 })` → 라우트 `ErrorBoundary`에서 `RouteError`로 표시. 오류 화면도 레이아웃(머리글, 주제 메뉴) 안에 표시하려면 라우트마다 `ErrorBoundary` export
- 링크 경로는 `href('/posts/:postId', { postId })`로 생성 (경로·파라미터 타입 검사)
- 쓰기 요청: `fetch`에 `csrfHeaders()` 포함, 실패 시 `toApiError`(`src/api/error.ts`)가 ProblemDetail `detail`을 메시지로 사용
- 소유자 판별: `blog-layout` `clientLoader`가 주제 목록과 `fetchMe`를 함께 조회, 하위 라우트는 `useBlogLayoutData()`로 재사용. 소유자 전용 화면 `clientLoader`는 `requireOwner()` (비로그인 → `/login`)
- 글 작성 `/posts/new`, 수정 `/posts/:postId/edit`: `PostEditor` (velog 구성 참고, 2026-10-12 결정). 테두리 없는 큰 제목 → 주제 칩(`CategoryPicker`, 라디오) → 원문 textarea | 미리보기 나란히 → 하단 고정 바(나가기, 게시/저장). 라벨 대신 placeholder + `aria-label`. 저장은 라우트 `clientAction` → 성공 시 `redirect`, 실패 시 `{ error }` 반환(입력 유지). 삭제는 글 상세 `clientAction` + `window.confirm`
- 편집기 이미지: 본문 칸에 끌어놓기·붙여넣기, 하단 바 `이미지` 버튼(파일 선택, 여러 장). 커서 자리에 `![업로드 중: …]()` 표시 → 올라가면 `![](주소)`로 교체, 실패 시 표시 제거 + 하단 바 오류. 올리는 중에는 게시 비활성. 본문 이미지는 `loading="lazy"`, 폭 맞춤
- 주제 선택(`CategoryPicker`): 고른 경로를 따라 줄이 열림 `CATEGORY`(큰 주제 칩 + `[+]`) → `↳ SUB`(`선택 안 함` + 하위 칩 + `[+]`) → `↳ SECTION`(3단계). 줄 위치로 무엇을 만드는지 구분 (2026-10-12 소유자 결정, 별도 `주제 만들기` 칸은 써 보고 제외). `[+]`는 점선 칩, 누르면 칩이 옆으로 펼쳐지며 입력 칸 등장·`+`가 `×`로 회전(Enter 또는 `↵` 만들기, Esc 또는 `×` 닫기, 소유자 만족). 제출은 숨은 `categoryId` 하나(가장 깊이 고른 주제). 글은 어느 단계에나 가능
- 주제 화면 `/categories/:slug` (2026-10-13 소유자 결정, 글 목록을 한 번에 보여 주지 않음): 단계가 깊어질수록 바둑판이 잘게 나뉨. 큰 주제 화면은 하위 주제 칸 한 줄 2칸(`CategoryTiles` columns 2) → 하위 주제 화면은 그 아래 주제 칸 한 줄 4칸(columns 4, 좁은 화면 2칸) → 세부 주제(하위 주제 없는 주제)는 글 카드 한 줄 8칸(`PostCards`, 좁은 화면 4·2칸, 24개씩 더 보기). 모든 판은 러스트 · 진한 러스트 바둑판(CSS nth-child, 칸 수가 바뀌어도 무늬 유지), 칸 사이·바깥은 `--board-gap` 4px로 세이지 배경이 선처럼 보임, 빈자리는 색만 칠한 빈 칸으로 마지막 줄을 채움(글이 없으면 빈 줄 하나), 칸 안 글은 가로세로 가운데. 러스트 위 차콜은 큰 글자만 대비 기준을 넘어 칸 이름·글 수·글 제목은 굵게 20px 이상, 글 카드 날짜는 뺌. 전환: 누른 칸 이름 → 다음 화면 제목(주제 id별 이름 `cat-<id>` + class `category-title`, `utils/viewTransition.ts`, 뒤로 가기도 되돌아감), 판 전체는 `category-board` 하나로 서서히 흐려지며 다음 판으로, 새 칸·새 이름은 제목 이동이 60% 지난 뒤 떠오름(`:root:active-view-transition`, `:only-child`). 글 카드를 누르면 주제 칸과 같은 방식: 카드 제목이 글 화면 제목 자리로 이어서 이동(`post-title`), 판은 서서히 흐려지고, 글 화면의 정보 줄·띠·본문은 제목 이동이 60% 지난 뒤 떠오름(그래프·Streak에서 들어올 때도 같음, 2026-10-13)
- Category `/posts` (2026-10-13 소유자 결정, 이전 이름 `전체` 글 목록): 홈 그래프에서 확대하지 않고 `Card`를 누르면 오는 화면. 제목 `Category`, 큰 주제 바둑판 한 줄 2칸. 그래프 → Category 전환(`ConstellationMap` `gatherThenOpenCards`): 하위 주제·글 별이 각자의 큰 주제 별로 모여들고(CSS `translate`로 지도 단위 이동, 선·범례는 흐려짐) 큰 주제 별이 그 자리에서 칸 색 별(HTML 표지, 그래프와 같은 ✦ 모양, `--gather-size` 4rem)로 커짐(사각형 표지는 소유자가 어색하다고 해 별 모양으로) → `--dur-travel`의 80% 시점에 화면 전환, 별 표지(`tile-<id>`, class `gather-tile`)는 더 커지지 않고 그 크기 그대로 Category 칸 가운데로 날아가며 칸이 그 주위로 펼쳐짐(2026-10-13 소유자 결정: 합쳐질 때 커지면 번지고 과함. `::view-transition-old(*.gather-tile)`을 `--gather-size` 고정 크기로 `inset: 0; margin: auto` 가운데 배치), 동시에 Card 글자(`view-title`)가 Category 제목 자리로 이동하며 글자가 바뀜(뒤로 가기는 Category → Card). 움직임 줄이기·새 탭은 바로 이동. `PostList`·`PagedPostList`(옛 목록)는 삭제
- 홈 그래프가 떠 있을 때 머리글 주제 메뉴를 누르면 그래프가 받아 처리(`registerHomeCategoryHandler`, 2026-10-13): Card와 같은 순서로 그 주제의 글·세부 주제 별이 각자의 하위 주제 별(◎)로 모여들고 나머지 별·선·큰 주제 별은 흐려지며, ◎ 자리에 칸 색 ◎ 표지가 `--gather-size`까지 커진 뒤(초점) 화면 전환에서 그 크기 그대로 각자의 칸 가운데로 날아가고 칸이 그 주위로 펼쳐짐(✦와 같은 규칙). 다른 화면에서는 아래 방식
- 머리글 주제 메뉴를 누르면 그래프 → Card와 같은 방식으로, 하위 주제 수만큼 칸 색 ◎ 별(그래프의 하위 주제 모양, `--gather-size`)이 메뉴 아래에 떠(`spawnTileStars`, 화면 위 고정 층) 그 크기 그대로 각자의 하위 주제 칸 가운데로 날아가고 칸이 펼쳐짐 (2026-10-13, ✦·작은 점 이동은 써 보고 제외). 주제 칸은 모두 `tile-<id>` 전환 이름(그래프 별, 메뉴 별과 짝), 짝이 없는 칸은 제목이 자리 잡은 뒤 떠오르고 사라지는 칸은 흐려짐
- 큰 주제는 하위 주제가 없어도 기본 화면이 한 줄 2칸 빈 바둑판 (큰 주제에는 글을 쓰지 않으므로, 2026-10-13). 하위 주제 아래 단계에서 하위 주제가 없으면 글 카드 판
- 머리글 메뉴(큰 주제, Streak)를 누르면 메뉴 글자가 다음 화면 제목 자리로 이어서 이동 (2026-10-13, 주제는 `cat-<id>`, Streak은 `streak-title`). 머리글은 화면이 바뀌어도 남는 요소라 클릭 순간에만 이름을 붙이고(`nameForTransition`, 같은 이름이 이미 있으면 그쪽에 양보: Category 화면의 같은 주제 칸) 새 화면이 그려지는 순간 지움(`blog-layout`의 `useLayoutEffect` → `clearPendingNames`, 새 화면 캡처 전이라 제목과 이름이 겹치지 않음)
- 머리글은 화면 전환 때 제자리(`view-transition-name: site-header`): 새 화면이 떠오를 때 머리글까지 움직여 겹쳐 보이던 문제
- 주제 메뉴: 머리글에는 큰 주제만, 펼침 메뉴 없음 (2026-10-12 소유자 결정, 펼침은 써 보고 제외). 메뉴를 가리키면(마우스·키보드 포커스) 홈 별자리 지도에서 그 주제 별자리에 불이 들어옴 (`hooks/mapHighlight.ts` Context, `blog-layout`이 제공, `ConstellationMap`이 읽음, 지도 위를 직접 가리킬 때가 우선). 아래 단계 주제 화면이면 큰 주제 메뉴도 활성(`is-active`). 하위 주제로는 주제 화면의 하위 주제 칸(바둑판)과 지도 별로 이동. 주제 화면 라벨 자리는 상위 경로(`Cloud Engineer / AWS-SAA`)
- 로고 옆 칸(`site-brand-link`): `Streak`(모두), `글쓰기`(소유자 로그인 시만). 주제 메뉴와 섞지 않음
- Streak `/streak` (2026-10-13 소유자 결정, 일정 보드 대체, 예전 `/schedules`는 `/streak`로 이동): 머리 칸 `Streak` + 오른쪽 달 이동 `← 2026.10 →`(가장 오래된 글의 달 ~ 이번 달, 모든 달력에 함께 적용) → 큰 주제마다 카드(`StreakCard`, 주제를 만들면 저절로 생김): 주제 이름 + 한 달 달력(월요일 시작 7열, 한국 날짜 기준 `utils/streak.ts`) + 색 범례(하위 주제만). 글 쓴 날만 색 칸, 나머지 날은 숫자만(칸·음영 없음, 오늘은 굵게, 앞날은 옅게). 색은 그날 쓴 하위 주제(2단계) 수만큼 항상 N등분 세로 줄무늬, 3단계 주제 글은 위 하위 주제 색, 하위 주제가 있는 큰 주제에 바로 쓴 글은 차콜(범례에 큰 주제 이름을 다시 쓰지 않음, 소유자 결정). 색 `SUB_COLORS`(진한 러스트 · 청록 · 남색 · 올리브 · 자주, 세이지 대비 4.2:1 이상). 연속 일수·이번 달 글 수는 써 보고 제외. 칠한 칸을 가리키면(마우스·키보드 포커스·탭) 그날 글 팁(2026-10-13 소유자 피드백으로 여러 번 조정): 칸 **위**에 뜨고 아래 화살표가 칸을 가리킴(아래에 뜨면 다음 줄 날짜를 가림), 열림·닫힘 모두 서서히(투명도 + 화살표 쪽에서 커짐 + 살짝 떠오름, 항상 그려 두고 `data-open`만 바꿈, 첫 등장은 `@starting-style`), 다른 칸으로 옮기면 같은 팁이 미끄러져 이동, 글은 모두 보여 줌(펼치기 버튼 없음), 아주 많을 때만 안에서 스크롤하되 기본 스크롤 막대는 숨기고 위아래 끝을 흐리게(mask), 팁으로 마우스를 옮길 수 있게 0.2초 늦게 닫힘, 바깥 누름·Esc로 닫힘. 써 보고 제외: 칸 아래 팝오버 + `+N` 펼치기, 달력 아래 고정 목록(Apple 캘린더 월 보기 방식, 소유자: 팁 방식이 좋음). 제목을 누르면 글 목록·그래프와 같은 `post-title` 공유 요소 전환으로 글 화면 제목 자리로 이동. 방문자도 봄(글이 공개라서), 소유자 전용 요소 없음. 써 보고 제외: 반복 일정 등록·완료 체크·습관 카드·달성 링·날짜 머리 칸·주간 줄(2026-10-13 삭제), 가리키면 뜨던 세로로 긴 스크롤 팁
- 페이지 제목은 React 19 `<title>` 요소를 라우트 컴포넌트에 직접 렌더링 (`meta` export 대신, React Router 문서 권장)
- 글 본문은 마크다운 원문 저장, 화면에서는 `MarkdownContent`(react-markdown)로 렌더링. 원문 HTML은 글자로 이스케이프되는 기본값 유지, HTML 허용(`rehype-raw`)이 필요하면 `rehype-sanitize` 함께 적용
- 화면 확인은 사용자가 Windows 브라우저(http://localhost:5173)에서 진행. UI 변경 후에는 확인할 항목을 정리해 요청
- Claude 자체 화면 확인: scratchpad에 Playwright 설치 후 `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64`로 headless Chromium 실행(Ubuntu 26.04 미지원 우회), 소유자 화면은 `/api/auth/me`를 route로 가짜 응답. 컨테이너 재빌드 시 사라짐
- 프리로더(`components/Preloader.tsx`): 홈 화면(`/` 그래프, `/posts` 전체 목록)을 불러올 때마다 재생 (2026-10-12 소유자 결정). `root.tsx` `<head>`의 인라인 스크립트(`INTRO_SCRIPT`)가 `<html data-intro="play|skip">`을 정함. 다른 주소로 바로 들어오거나 움직임 줄이기 설정이면 skip
- `RollText`는 `overflow: hidden`이라 글자 칸에 위아래 여유(`padding-block: 0.2em` + 같은 만큼 음수 margin)를 둠: 줄 높이 1인 큰 제목에서 g·y 아래 획이 잘리던 문제
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
| `--color-text-muted` | #4b524a (세이지 + 차콜 75%) | 선택되지 않은 항목 글자 (보기 전환 등) | 세이지 대비 4.75:1 (4.5:1을 넘는 가장 옅은 값) |

- 러스트(#bd573d)는 세이지 위 글자나 유일한 상태 표시(링크 밑줄, 선택 메뉴)에 사용 금지 (WCAG 1.4.3, 1.4.11)
- 큰 글자(24px 이상, 굵게 18.66px 이상)만 러스트 비주얼 위에 겹치기 허용 (차콜/러스트 3.19:1)
- 글꼴: Pretendard 한 가족. 제목 900, 본문 400. `word-break: keep-all`, `overflow-wrap: break-word`
- 레퍼런스 느낌: 포스터형. 화면을 채우는 아주 굵은 차콜 제목(글자 자체가 그래픽), 러스트 단색(듀오톤, 망점 질감) 비주얼, 얇은 러스트 막대, 그림자·그라데이션 없는 평면 색면, 넓은 세이지 여백, 제목이 이미지 위에 겹침
- 강한 표현은 프리로더와 큰 제목에 집중, 글 목록·본문은 차분하고 읽기 우선
- 레퍼런스 포스터 이미지와 구성은 복제 금지, 비주얼은 직접 제작
- 움직임 시간 토큰 (2026-10-13 통일, `index.css` `:root`): `--dur-quick` 0.2초(가리킴 반응: 색·밑줄·살짝 커짐), `--dur-fade` 0.3초(투명도만), `--dur-ui` 0.45초 + `--ease-out-soft`(작은 요소 등장·펼침·팝오버·글자 올림), `--dur-travel` 0.8초 + `--ease-travel`(다른 자리로 이동: 프리로더 로고, 제목 공유 요소 전환), `--dur-move` 1초 + `--ease-in-out-soft`(크기·위치가 크게 바뀜: 그래프 확대, 막대 폭). 새 움직임은 이 다섯 가지 중에서 고름, 숫자를 직접 쓰지 않음. JS 상수(`ZOOM_MS`, 프리로더 `MOVE_MS`·`FADE_MS`)도 토큰 값과 같게. 예외는 첫 등장 연출(프리로더 Z 채움 1.3초·선 0.6초, 그래프 별·선 순차 등장)
- 움직임: 작은 등장·펼침은 `--ease-out-soft`(iOS 시트 계열 `cubic-bezier(0.32, 0.72, 0, 1)`) 0.4~0.5초, 크기·위치가 크게 바뀌는 움직임(그래프 확대, 막대 폭)은 `--ease-in-out-soft`(`cubic-bezier(0.65, 0, 0.25, 1)`, 프리로더 계열) 0.9~1.1초 — 빠르게 튀어나가는 ease-out은 "뚝딱" 느낌이라 소유자가 거절(2026-10-12), 처음 나타나는 요소는 `@starting-style`, 접힘까지 부드럽게 하려면 `display ... allow-discrete`. 모두 `prefers-reduced-motion`이면 전환 없음
- 접근성: `:focus-visible` 차콜 2px 테두리 유지 (예외: 편집기의 테두리 없는 입력 칸은 외곽선 없음, 소유자 결정 2026-10-12), 프리로더와 글자 올림 효과는 `prefers-reduced-motion`이면 생략
- 화면 문구: 소개 문장, 태그라인 같은 꾸밈 문구는 임의로 넣지 않음. 문구는 소유자가 결정
- 레이아웃 참고: https://mijobello.com (격자선, 칸 구성, 작은 대문자 라벨). 화면 가운데 기둥(`site-shell`)을 진한 러스트 1px 격자선으로 나눔: 머리글(로고 칸 | 메뉴 칸), 페이지 머리 칸, 목록 행(번호 칸 | 제목·정보 칸), 글 정보 칸
- 글자는 모두 차콜 (로고, 제목, 라벨 포함). 진한 러스트 글자는 써 보고 제외 (2026-10-12 소유자 결정)
- 페이지 제목은 메뉴 이름 그대로
- 글 제목에 순서 번호(`01` 등)를 넣지 않음 (2026-10-12 소유자 결정). 그래프로 돌아가는 길: 글 상세 제목 위(러스트 막대 위) 보기 전환 `Graph | Card`(글 화면은 어느 쪽도 선택되지 않음), 목록 화면(`/posts`, 주제 화면) 머리 오른쪽 보기 전환 `Graph | Card` → `/?focus=slug`. 보기 전환은 선택된 쪽 진한 러스트 칸 + 세이지 글자, 나머지 `--color-text-muted` AWS-SAA 목차 글 27개는 본문 `작성 예정` 상태로 세부 주제별 생성됨
- 홈(`/`): 머리글 아래 화면 전체가 별자리 지도 (2026-10-12 소유자 결정, 머리글에 `전체` 메뉴 없음). 글 목록은 보기 전환의 `목록`으로: 전체는 `/posts`(20개씩 더 보기), 주제는 주제 화면
- 그래프(홈 별자리 지도, 보기 전환 문구는 `Graph | Card`(2026-10-13), 화면 용어는 "그래프" — Obsidian 그래프 뷰에서 가져온 일반적인 이름, 2026-10-12. 코드 이름은 `ConstellationMap`, 배치 `utils/constellation.ts`, Obsidian 그래프 뷰에서 착안): 모든 단계가 같은 규칙(재귀). 자기 글은 둘레에 황금각 나선(phyllotaxis, 수백 개도 겹치지 않음)으로 흩어지되 나선 시작을 바깥으로 옮겨 가운데를 비움(부모 별에 붙어 뭉쳐 보이지 않도록). 부모에서 들어오는 선 방향 좌우 약 25°(`PARENT_LINE_GAP` 50°)는 비우고 나머지 호에 나선을 균등하게 다시 펼쳐 별이 선 위에 얹히지 않게 함(소유자 요청 2026-10-12). 직선으로 뻗는 가지 배치는 써 보고 제외(소유자: "주위로 생기는 게 더 좋음", 2026-10-12). 하위 주제는 바깥 고리(큰 주제는 둘레 전체, 그 아래는 부모 쪽 약 70°를 비운 호)이고, 고리 반지름은 이웃의 옆 폭(halfWidth) 기준(글만 있는 주제는 반지름의 70% `LEAF_WIDTH`: 고리를 줄여 부모 별과 글을 잇는 선이 상대적으로 길어 보이게, 소유자 요청 2026-10-12). 지도는 화면에 맞춰 축소되므로 선 길이는 절대값(`POST_SPACING`)이 아니라 고리 대비 비율로 조정. 주제 id로 고정된 작은 흔들림(각도 ±8%, 거리 +25%). 그 배치를 출발점으로 힘 기반 정리(`relax`, Obsidian과 같은 force-directed: 선은 스프링, 모든 별은 서로 밀어냄, 가운데로 약한 끌림, 320회 식힘)를 거쳐 외딴 큰 주제도 화면 안쪽에 자연스럽게 퍼짐(소유자 지적 2026-10-12: 큰 별자리 원에 밀려 작은 주제가 화면 끝으로 갔음). 축소 비율을 재서 이름표 자리만큼 한 번 더 배치(두 번 계산), 범위는 이름표 끝까지, 겹치는 작은 주제 이름은 숨기고 가리키면 표시. 좁은 화면은 아래 3.5rem을 범례·보기 전환 자리로 비움. 선은 각 글을 먼저 놓인 가장 가까운 별과 이어 가지 모양. 단계마다 모양이 다름(2026-10-12 소유자 결정, 성도의 등급 기호 방식): 큰 주제 ✦ 4갈래 별, 하위 주제 ◎ 고리 두른 별, 세부 주제 ◆ 마름모, 글 • 점. 왼쪽 아래 범례(`Category · Sub · Section · Post`). 별색은 러스트(#bd573d) 하나. 지도 svg는 무대 칸에 `position: absolute`로 고정(자기 비율로 높이를 키워 화면보다 길어지던 문제). 가리키면 그 묶음(위·아래 단계)만 밝아짐. 좁은 화면(<640px)은 세로 배치, 많이 축소되면 작은 주제 이름은 가리킬 때만. 별·글자는 화면 px 고정(ResizeObserver로 배율 측정). 주제 별을 누르면 목록 화면으로 이동하지 않고 지도 안에서 그 별자리로 확대(2026-10-12 소유자 결정): 보이는 범위(viewBox)를 rAF로 1.1초 ease-in-out 보간(`useAnimatedBox`, 프리로더와 같은 속도감)해 별·글자 크기는 유지, 확대 대상 밖은 흐리게(`is-faint`). 상태는 주소 `/?focus=slug`(뒤로 가기로 한 단계씩 축소, 공유 가능, `shouldRevalidate`+`utils/focusParam.ts`로 이때 데이터 재요청 없음). 왼쪽 위 막대 `[esc] | 경로(누르면 그 단계로)`(`전체`는 소유자 결정으로 뺌, 전체로는 Esc 반복·빈 곳 클릭·로고)(키 모양 버튼이 한 단계 위로, 터치 기기는 ←): 항상 렌더링하고 `is-visible`로 나타남·사라짐 전환, 폭은 내용 폭을 재서 CSS 전환(갑자기 생기던 문제). Esc·빈 곳 클릭도 한 단계 축소. 다른 화면에서 `?focus=`로 들어오면 전체 지도에서 시작해 확대되며 들어옴. 깊은 단계 최소 확대 범위는 지도 단위 300×220 고정. 오른쪽 위 보기 전환 `Graph | Card`(`ViewSwitch`): 확대한 주제가 있으면 그 주제 목록, 없으면 `/posts`. 가장 깊은 단계(또는 하위 주제 없는 주제)까지 확대하면 글 별 옆에 제목(`utils/labelPlacement.ts`: 오른쪽·왼쪽·위·아래 중 겹치지 않는 첫 자리, 부모 별에서 먼 쪽 우선, 캔버스로 글자 폭 측정, 주제 이름표 자리도 피함), 그 위 단계는 가리킬 때 큰 제목. Ctrl/Cmd 클릭은 주제 목록 화면 새 탭. 키보드는 주제 별만 Tab 이동(Enter 확대), 글은 주제 화면 목록으로 접근 글 별에 마우스를 올리면 별이 커지고 주제 + 큰 제목(`.hover-title`, 이전의 작은 카드 대체)이 별 쪽 끝을 기준으로 작게 시작해 커지며 나타남(방향은 작은 제목이 있던 쪽, 없으면 오른쪽이고 실제 제목 폭이 화면을 넘을 때만 왼쪽), 클릭하면 대기 없이 View Transition 공유 요소 전환으로 그 큰 제목이 글 화면 제목(h1) 자리로 이동(클릭 후 잠깐 확대됐다 이동하던 방식은 소유자 판단으로 제외)(같은 `view-transition-name: post-title`, 프리로더 로고 이동과 같은 0.8초 `cubic-bezier(0.7, 0, 0.2, 1)`, 2026-10-12 소유자 요청). Ctrl/Cmd 클릭은 새 탭, 움직임 줄이기는 즉시 이동.
- 많을 때 대비 (2026-10-12): 주제 화면은 20개씩 `더 보기`(`PagedPostList`, 클라이언트 분할. 글이 수천 개가 되면 백엔드 페이지네이션 검토)
- 써 보고 제외 (홈): 잡지형 커버(최신 글 대형 제목 + 그림), Bauhaus 기하 도형 생성 그림, 망점 책 그림, 글 상세 망점 띠(`Halftone`), `Archive` 섹션, 지도 아래 주제 섹션·칸
- 로고는 `Zoolog` (첫 글자 `Z`만 진한 러스트로 현재 메뉴 칸·목록 번호 칸과 같은 색, 링크에 `aria-label="Zoolog"`로 한 단어로 읽힘)
- 러스트 사용처: 짧은 막대(글 제목 위, 본문 소제목 앞, 인용, 코드 블록 왼쪽), 글 상세 정보 칸 아래 단색 막대(`post-band`, 0.5rem), 별자리 지도의 별·선
- 목록 번호는 현재 메뉴 칸과 같은 진한 러스트 칸 + 세이지 글자, 항상 표시
- 활성 메뉴는 진한 러스트 칸 + 세이지 글자 (4.59:1). 버튼은 얇은 진한 러스트 테두리, 마우스를 올리면 채움
- 글 목록에서 제목을 누르면 그 제목이 글 화면 제목 자리로 이어서 이동 (`PostList`의 `PostTitleLink`: `useViewTransitionState`로 목적지 링크에만 `view-transition-name: post-title`, 그래프 글 별과 같은 공유 요소 전환, 2026-10-12)
- 목록 제목, 주제 메뉴에 마우스를 올리면 글자가 위로 빠지고 아래에서 같은 글자가 올라옴 (`RollText`, 감싸는 요소에 `roll-trigger` 클래스, 0.45초 `cubic-bezier(0.65, 0, 0.35, 1)`). 메뉴는 동시에 진한 러스트 칸 + 세이지 글자로 바뀜. 움직임 줄이기 설정이면 글자 올림 없이 목록은 밑줄
- 써 보고 제외한 것 (소유자 판단): 망점 글자를 겹친 포스터형 페이지 머리, 로고 옆 러스트 커서 막대, 바닥글(러스트 면, mijobello식 포함)

## 포트폴리오 기록 (2026-10-13 소유자 요청)

- 소유자는 SW Engineer · Cloud Engineer 취업 준비 중. 이 프로젝트를 GitHub 프로필 · 포트폴리오 블로그(kimzoo5676-del.github.io) · 자소서에 쓸 예정
- 기능 조각이 끝날 때마다 함께 갱신: `docs/portfolio/decisions.md`(상황 → 선택지 → 결정과 이유 → 결과), `docs/portfolio/troubleshooting.md`(증상 → 원인 → 해결 → 배운 점), 필요하면 `docs/portfolio/resume-notes.md`, `README.md`
- 수치는 측정한 것만 측정 방법과 함께. 저장소가 공개라 비밀값 · 서버 IP · 개인 정보 금지
- 서버 관리 명령 정리: `docs/kubectl-cheatsheet.md`

## Git

- Conventional Commits, 한국어 메시지: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
- `style`은 코드 서식 정리 전용 (CSS 디자인 변경은 `feat`)
- 이유가 필요한 변경은 본문에 기록: `git commit -m "제목" -m "이유"`
- 기능 조각 하나가 테스트·lint 통과 후 커밋. `package-lock.json`, `devcontainer-lock.json` 커밋 대상. push는 요청 시에만

## 다음 작업 (순서)

1. (완료) 프론트: React Router로 주제별 글 목록, 글 상세 화면 + 마크다운 렌더링
2. (완료) Google 로그인, 글 작성·수정·삭제(소유자 전용), 편집기에서 주제 추가
3. (완료) 이미지 업로드 (SeaweedFS S3, `post_image.object_key`). 남은 일: 연결 없는 이미지 정리, 대체 텍스트(alt) 입력 안내
4. (완료) Streak 화면 (2026-10-13, 일정 보드 대체). 일정 백엔드는 남아 있음
5. (완료) 첫 진입 프리로더
6. 2차 기능 (Gmail 알림, 뉴스 스크랩)
7. (완료) 배포 (2026-10-13): https://zoolog.site 운영 중. Lightsail + k3s + Argo CD + Caddy ("운영" 절). React 빌드는 Caddy가 제공하고 `/api`·`/oauth2`·`/login/oauth2`만 Spring으로. 저장소 https://github.com/kimzoo5676-del/Zoolog (공개), 이미지 `ghcr.io/kimzoo5676-del/*` (공개)

## 열린 이슈

- 브라우저 배경이 세이지가 아닌 흰색으로 보인 적 있음, 원인 미확인. 브라우저 콘솔에서 `getComputedStyle(document.body).backgroundColor`가 `rgb(190, 203, 179)`인지 확인 필요
