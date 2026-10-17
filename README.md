# Zoolog

> 공부한 내용을 별자리 그래프로 쌓아 가는 개인 개발 블로그

공부 글을 주제 3단계(예: Cloud Engineer > AWS-SAA > 컴퓨팅)로 정리해 홈 화면의 그래프에 별자리처럼 보여 주고, 글을 쓴 날을 주제별 달력에 색으로 쌓아 가는 1인 개발 서비스. 글쓰기는 소유자만, 방문자는 읽기만 가능.

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
- [아침 기사 메일과 뉴스 스크랩](#아침-기사-메일과-뉴스-스크랩)
- [데이터 모델](#데이터-모델)
- [기술적 결정과 트러블슈팅](#기술적-결정과-트러블슈팅)
- [학습 노트](#학습-노트)
- [실행 방법 (개발)](#실행-방법-개발)

## 주요 기능

- **그래프 홈:** 주제와 글을 별자리 지도로 표시. 힘 기반 배치(force-directed)로 수백 개 글도 겹치지 않게 퍼짐, 주제를 누르면 그 별자리로 1초 확대, 주소(`/?focus=slug`)로 확대 상태 공유
- **공부 글:** 마크다운 원문 저장, 편집기에서 이미지 끌어놓기·붙여넣기 업로드, 주제 3단계 분류
- **Streak:** 큰 주제마다 한 달 달력에 글 쓴 날을 하위 주제 색으로 칠함, 칸을 가리키면 그날 글, 누르면 글 화면으로 이어서 이동
- **소유자 로그인:** Google OIDC, 지정한 이메일 1개만 로그인 허용, 서버 세션 + CSRF 보호
- **소유자 메일:** 매일 07:00·18:00 공부 알림, 06:00 아침 기사(핫이슈 1 + IT·취업 2, Google 뉴스 RSS · 네이버 뉴스 검색 API, 규칙 기반 선정)
- **뉴스 스크랩:** 아침 기사 메일의 링크로 글을 쓰면 News Clipping > 달 > 주 주제 아래 게시(기사 본문은 복제하지 않고 제목·원문 링크·직접 쓴 글만)
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

서버는 Lightsail 1대이고, 그 위의 k3s(가벼운 쿠버네티스)에서 컨테이너 4종이 돔. 인터넷에 열린 것은 Caddy의 80·443 포트 하나뿐이고 DB와 이미지 저장소는 클러스터 안에서만 접근 가능.

```mermaid
flowchart LR
  U["브라우저<br/>zoolog.site"]
  subgraph LS["AWS Lightsail 1대 (k3s)"]
    direction LR
    subgraph NS["네임스페이스 zoolog"]
      WEB["web (Caddy)<br/>HTTPS 인증서 자동 발급<br/>React 빌드 파일 제공"]
      BE["backend (Spring Boot)<br/>API, 로그인, 예약 메일"]
      PG[("postgres<br/>글, 주제, 기록")]
      SW[("seaweedfs<br/>이미지 파일")]
      BK["postgres-backup<br/>매일 03:00 pg_dump"]
    end
    ARGO["Argo CD<br/>Git과 클러스터를 맞춤"]
  end
  U -->|"80 · 443만 공개"| WEB
  WEB -->|"/api · /oauth2 · /login/oauth2"| BE
  BE --> PG
  BE --> SW
  BK --> PG
  BE -->|"로그인"| G["Google OIDC"]
  BE -->|"메일 발송"| M["Gmail SMTP"]
  BE -->|"기사 후보"| N["Google 뉴스 RSS<br/>네이버 뉴스 검색"]
  ADM["관리자 노트북"] -.->|"Tailscale SSH만"| LS
```

| 구성 요소 | 종류 | 메모리 상한 | 배포 방식 |
| --- | --- | --- | --- |
| web (Caddy) | Deployment | 128Mi | RollingUpdate (무중단) |
| backend (Spring Boot) | Deployment | 640Mi | Recreate (약 30초 API 중단) |
| postgres | StatefulSet + PVC | 256Mi | - |
| seaweedfs | StatefulSet + PVC | 256Mi | - |
| postgres-backup | CronJob | - | 매일 03:00, 14일 보관 |

## 배포 흐름 (GitOps)

사람은 서버에 명령을 치지 않고 `main`에 push만 함. 서버에 무엇이 떠 있어야 하는지는 Git의 `deploy/k8s/`가 정하고, Argo CD가 Git과 클러스터를 계속 비교해 다르면 맞춤.

```mermaid
sequenceDiagram
  autonumber
  actor D as 개발자
  participant GH as GitHub (main)
  participant GA as GitHub Actions
  participant CR as GHCR (이미지 저장소)
  participant AR as Argo CD
  participant K as k3s

  D->>GH: git push
  GH->>GA: 배포 작업 시작
  GA->>GA: 백엔드 테스트 (PostgreSQL · SeaweedFS 서비스 컨테이너)
  GA->>GA: 프론트 lint · 타입 검사
  GA->>CR: 이미지 2개 업로드 (태그 = 커밋 SHA)
  GA->>GH: kustomization.yaml 이미지 태그를 바꿔 커밋
  AR->>GH: 변경 감시
  AR->>K: 새 태그로 반영 (자동 sync · prune · selfHeal)
  K->>CR: 새 이미지 받기
```

- 되돌리기는 태그 커밋을 `git revert`. Git과 서버가 항상 같은 상태를 가리킴
- 화면 서버(Caddy)는 RollingUpdate 무중단 배포: 배포 중 1초 간격 측정에서 화면 응답 실패 0회
- 백엔드는 2GB 메모리 한계로 Recreate(약 30초 API 중단). 무중단 전환은 보류([학습 노트](docs/learn/01-zero-downtime.md))
- 서버 준비 절차: [deploy/README.md](deploy/README.md)

## 아침 기사 메일과 뉴스 스크랩

매일 06:00 소유자에게 기사 3개(핫이슈 1, IT·취업 2)를 메일로 보내고, 메일 속 링크로 글을 쓰면 블로그 글이 됨. 서버가 그 시각에 꺼져 있었거나 발송이 실패하면 그날 안에 다시 보냄.

```mermaid
sequenceDiagram
  autonumber
  participant SC as NewsDigestScheduler
  participant GN as Google 뉴스 RSS
  participant NV as 네이버 뉴스 검색
  participant DB as PostgreSQL
  participant GM as Gmail
  actor O as 소유자
  participant WEB as /clips/new 화면
  participant API as POST /api/clips

  SC->>DB: 오늘 보낸 기록 있나? (06~23시 매시 정각, 서버 시작 시)
  DB-->>SC: 없음
  SC->>GN: 주요 기사 15개 (중요도 순)
  SC->>NV: 검색어 9개로 최신 기사 (24시간 안)
  SC->>NV: 핫이슈 제목으로 같은 기사 찾기 (원문 주소)
  SC->>SC: 규칙으로 IT·취업 2개 선정 (주가·광고 제외, 채용 우선)
  SC->>GM: 기사마다 코멘트 쓰기 링크
  SC->>DB: 오늘 보냄 기록
  GM-->>O: 메일 도착
  O->>WEB: 코멘트 쓰기 링크 (기사 정보가 주소에 담김)
  WEB->>API: 이미 스크랩한 기사인지 확인
  O->>API: 코멘트 게시
  API->>DB: News Clipping > 2026.10 > 2026.10 Week 3 아래 글 + 기사 주소 기록
```

- 공개 글에는 기사 제목·원문 링크·코멘트만 (기사 본문 복제 안 함)
- 같은 기사(주소)는 한 번만 스크랩. 글을 지우면 다시 가능
- 공부 알림 메일(07:00 AWS-SAA, 18:00 영어)은 설정 파일 목록대로 발송

## 데이터 모델

스키마는 Flyway(V1~V9)가 관리하고, JPA는 `ddl-auto: validate`로 엔티티와 DB가 맞는지 검사만 함.

```mermaid
erDiagram
  category ||--o{ category : "하위 주제 (최대 3단계)"
  category ||--o{ post : "글"
  post ||--o{ post_image_link : ""
  post_image ||--o{ post_image_link : "여러 글이 함께 사용"
  post ||--o| news_clip : "스크랩한 기사 주소"

  category {
    bigint id PK
    varchar name UK
    varchar slug UK
    bigint parent_id FK "NULL이면 큰 주제"
  }
  post {
    bigint id PK
    bigint category_id FK
    varchar title
    text content "마크다운 원문"
    timestamptz published_at "실제로 쓴 시각, 작성 예정이면 NULL"
  }
  post_image {
    bigint id PK
    varchar object_key UK "images/UUID.png"
    varchar content_type
    timestamptz unused_since "연결이 모두 끊긴 시각"
  }
  post_image_link {
    bigint post_id PK, FK
    bigint post_image_id PK, FK
  }
  news_clip {
    bigint id PK
    varchar url UK
    bigint post_id FK "글 삭제 시 함께 삭제"
  }
  news_digest_log {
    bigint id PK
    date sent_on UK "기사 메일 보낸 날"
  }
  member {
    bigint id PK
    varchar google_sub UK
    varchar email
  }
```

- 이미지는 글을 저장하기 전에 먼저 올라가고, 글을 저장할 때 본문에 쓰인 이미지만 연결. 연결이 모두 끊긴 지 1일이 지나면 매일 04:00 정리 작업이 파일과 기록을 삭제
- 모든 시각은 `TIMESTAMPTZ`, 기준 시간대는 Asia/Seoul

## 기술적 결정과 트러블슈팅

- [기술적 결정 기록](docs/portfolio/decisions.md): 무엇을 왜 골랐는지 (선택지, 이유, 결과)
- [트러블슈팅 기록](docs/portfolio/troubleshooting.md): 문제 → 원인 → 해결 → 배운 점
- [kubectl 자주 쓰는 명령](docs/kubectl-cheatsheet.md)

## 학습 노트

만들면서 생긴 질문을 하나씩 풀어 쓴 글. 질문 → 답 → 그림 → 직접 확인하는 방법 순서: [docs/learn](docs/learn/README.md)

## 실행 방법 (개발)

VS Code에서 저장소를 열고 **Reopen in Container**. `.devcontainer/.env.example`을 `.env`로 복사해 값 채움.

```bash
cd backend && ./gradlew bootRun      # http://localhost:8080
cd frontend && npm run dev           # http://localhost:5173
cd backend && ./gradlew test         # 개발 DB에서 실행 후 롤백
```
