# 포트폴리오 · 자소서용 정리

이력서 · GitHub 프로필 · 포트폴리오 블로그에 옮겨 쓰기 위한 요약. 수치는 측정한 것만 기록

## 한 줄 소개

공부 기록을 별자리 그래프와 주제별 글 스트릭 달력으로 보여 주는 개인 블로그를 기획부터 k3s GitOps 운영까지 혼자 만든 프로젝트

## GitHub 프로필용 (기존 프로젝트와 같은 카드 형식)

2026-10-14 프로필(kimzoo5676-del/kimzoo5676-del README)의 모디 다음 자리에 반영한 내용. 바꾸면 양쪽을 함께 수정

**Zoolog — 공부 기록 그래프 블로그** `2026.10 -` · 배지: Website(https://zoolog.site), GitHub

> 공부 글을 주제 3단계로 정리해 **별자리 그래프로 보여 주고, 글 쓴 날을 주제별 달력에 쌓아 가는** 개인 블로그.
> **기획 · 디자인 · 백엔드 · 프론트 · 인프라를 혼자 만들어 https://zoolog.site 에서 운영 중.**

**Role** · 1인 개발 (Infra / Backend / Frontend) | `Spring Boot` `PostgreSQL` `React` `TypeScript` `k3s` `Argo CD` `GitHub Actions` `Caddy` `AWS Lightsail`

- **GitOps 배포** — GitHub Actions(통합 테스트 → 이미지 빌드 → 매니페스트 태그 커밋) + Argo CD로 push만으로 k3s에 반영, `git revert`로 되돌리기
- **2GB 서버 운영 설계** — 컨테이너별 메모리 상한과 Argo CD core 설치로 서버 1대에 구성, 화면 서버 RollingUpdate로 배포 중 응답 실패 0회(1초 간격 측정)
- **아침 기사 메일 · 뉴스 스크랩** — Google 뉴스 RSS · 네이버 검색으로 후보를 모아 규칙 기반 선정, 못 보낸 날 재발송, 메일 링크로 코멘트를 달면 블로그 글로 게시(같은 기사 중복 방지)
- **그래프 홈** — 힘 기반 배치(force-directed)로 수백 개 글도 겹치지 않는 별자리 그래프, View Transition으로 화면 사이 제목이 이어지는 전환

기술 스택 배지(2026-10-14 소유자 정리): 프론트엔드 묶음 삭제, 핵심만(Spring은 Spring Boot 하나, DRF·Spring Security·Data JPA·Session 삭제, AWS EC2·Lightsail은 AWS 하나, GitHub·GitLab은 GitHub Actions·GitLab CI와 겹쳐 삭제), K3s·Argo CD 추가

## 이력서 bullet 후보

- k3s + Argo CD로 GitOps 배포 파이프라인 구축 (Git이 운영 상태의 기준, selfHeal로 수동 변경 방지)
- GitHub Actions에서 PostgreSQL · SeaweedFS 서비스 컨테이너로 통합 테스트 후 이미지 빌드
- 2GB 서버 제약에서 구성 요소별 메모리 상한 설계, Argo CD core 설치, 스왑으로 운영
- Caddy 자동 HTTPS, 리버스 프록시 뒤 Spring의 https 인식(forwarded headers) 구성
- Flyway로 스키마 버전 관리, `ddl-auto: validate`로 엔티티 · DB 불일치 조기 발견
- 매일 pg_dump 백업 CronJob + 서버 스냅샷 이중 백업

## 자소서 소재 (상황 → 행동 → 결과 → 배운 점)

### 제약 안에서 운영 구조를 설계한 경험

- **상황:** 월 $12, 메모리 2GB 서버 1대에서 쿠버네티스 GitOps를 운영하고 싶었음
- **행동:** 웹 화면 없는 Argo CD core 설치, 컨테이너별 메모리 상한(백엔드 640Mi 등), 서버 밖 빌드, 스왑 2GB. 무중단 배포는 메모리 여유가 있는 화면 서버부터 적용하고 백엔드는 관찰 후 결정하도록 단계를 나눔
- **결과:** 앱 4개 + k3s + Argo CD가 2GB에서 동작, 화면 서버 배포 중 응답 실패 0회(측정)
- **배운 점:** 좋은 기술을 모두 넣기보다 자원 한계와 위험을 측정해 적용 순서를 정하는 판단

### 원인을 메시지로 확인해 해결한 경험

- **상황:** 첫 배포에서 Argo CD 앱이 Unknown 상태로 아무것도 배포하지 않음
- **행동:** 추측 대신 Application의 `status.conditions`를 조회 → `default` 프로젝트 없음 확인 → core 설치에는 프로젝트를 만드는 구성 요소가 빠져 있다는 구조적 원인 파악
- **결과:** 프로젝트를 선언해 즉시 정상화, 같은 문제가 다시 생기지 않도록 설치 문서에 단계 추가
- 자세한 기록: [troubleshooting.md](troubleshooting.md)

## 기록 원칙

- 기능 조각이 끝날 때마다 [decisions.md](decisions.md)(왜 골랐나), [troubleshooting.md](troubleshooting.md)(무엇이 막혔고 어떻게 풀었나)에 추가
- 수치는 직접 측정한 것만 (측정 방법도 함께)
- 비밀값, 서버 IP, 개인 정보는 적지 않음 (저장소 공개)
