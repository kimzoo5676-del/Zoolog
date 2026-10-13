# Zoolog

> 공부한 내용을 별자리 그래프로 쌓아 가는 개인 개발 블로그 + 일정 비서

공부 글을 주제 3단계(예: Cloud Engineer > AWS-SAA > 컴퓨팅)로 정리해 홈 화면의 그래프에 별자리처럼 보여 주고, 매일 반복하는 공부 일정을 체크해 기록하는 1인 개발 서비스. 글쓰기와 일정 관리는 소유자만, 방문자는 읽기만 가능.

| 구분 | 내용 |
| --- | --- |
| 주소 | https://zoolog.site |
| 기간 | 2026.10 ~ (진행 중) |
| 형태 | 개인 프로젝트 (기획 · 디자인 · 백엔드 · 프론트엔드 · 인프라 전부) |
| 운영 | AWS Lightsail 1대 + k3s + Argo CD (GitOps) |

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시스템 구성](#시스템-구성)
- [배포 흐름 (GitOps)](#배포-흐름-gitops)
- [기술적 결정과 트러블슈팅](#기술적-결정과-트러블슈팅)
- [실행 방법 (개발)](#실행-방법-개발)

## 주요 기능

- **그래프 홈:** 주제와 글을 별자리 지도로 표시. 힘 기반 배치(force-directed)로 수백 개 글도 겹치지 않게 퍼짐, 주제를 누르면 그 별자리로 1.1초 확대, 주소(`/?focus=slug`)로 확대 상태 공유
- **공부 글:** 마크다운 원문 저장, 편집기에서 이미지 끌어놓기·붙여넣기 업로드, 주제 3단계 분류
- **일정 보드:** 반복 일정(요일·시각), 완료 체크, 그날 완료 수, 연속 일수, 최근 5주 달력
- **소유자 로그인:** Google OIDC, 지정한 이메일 1개만 로그인 허용, 서버 세션 + CSRF 보호
- **첫 진입 프리로더:** 로고 `Z`가 차오른 뒤 머리글 자리로 이동하고 격자선이 그어지는 애니메이션

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 백엔드 | Java 25, Spring Boot 4.1, Spring Security(OAuth2 Login), Spring Data JPA, Hibernate 7, Flyway |
| DB · 저장소 | PostgreSQL 18, SeaweedFS(S3 호환, AWS SDK for Java v2) |
| 프론트엔드 | React 19, TypeScript 6, React Router 8(SPA 모드), Vite 8, react-markdown |
| 인프라 | AWS Lightsail, k3s, Argo CD(core), Kustomize, Caddy(자동 HTTPS), Tailscale |
| CI/CD | GitHub Actions, GHCR(GitHub Container Registry) |
| 개발 환경 | VS Code Dev Containers(Docker Compose: 앱 · PostgreSQL · SeaweedFS) |

## 시스템 구성

```
브라우저 ── https://zoolog.site (80/443만 공개)
              │
Lightsail 1대 (k3s)
  ├ web: Caddy ── Let's Encrypt 인증서 자동 발급·갱신, React 빌드 파일 제공
  │        └ /api, /oauth2, /login/oauth2 → backend
  ├ backend: Spring Boot ── postgres (DB)
  │                       └ seaweedfs (이미지, 외부 비공개)
  └ postgres-backup: 매일 03:00 pg_dump, 14일 보관

관리 접속: Tailscale SSH만 (공개 SSH 포트 닫음)
```

## 배포 흐름 (GitOps)

```
git push main
  └ GitHub Actions
      1. 백엔드 테스트 (서비스 컨테이너로 PostgreSQL · SeaweedFS를 띄워 통합 테스트)
      2. 프론트 lint · 타입 검사
      3. 이미지 2개 빌드 → GHCR 업로드 (태그 = 커밋 SHA)
      4. deploy/k8s/kustomization.yaml 이미지 태그를 바꿔 커밋
  └ Argo CD가 Git 변경을 감지해 k3s에 반영 (자동 sync · prune · selfHeal)
되돌리기 = 태그 커밋 git revert
```

- 화면 서버(Caddy)는 RollingUpdate 무중단 배포. 배포 중 1초 간격 측정에서 화면 응답 실패 0회
- 백엔드는 2GB 메모리 한계로 Recreate(약 30초 API 중단), 메모리 관찰 후 무중단 전환 결정 예정
- 서버 준비 절차: [deploy/README.md](deploy/README.md)

## 기술적 결정과 트러블슈팅

- [기술적 결정 기록](docs/portfolio/decisions.md): 무엇을 왜 골랐는지 (선택지, 이유, 결과)
- [트러블슈팅 기록](docs/portfolio/troubleshooting.md): 문제 → 원인 → 해결 → 배운 점
- [kubectl 자주 쓰는 명령](docs/kubectl-cheatsheet.md)

## 실행 방법 (개발)

VS Code에서 저장소를 열고 **Reopen in Container**. `.devcontainer/.env.example`을 `.env`로 복사해 값 채움.

```bash
cd backend && ./gradlew bootRun      # http://localhost:8080
cd frontend && npm run dev           # http://localhost:5173
cd backend && ./gradlew test         # 개발 DB에서 실행 후 롤백
```
