# 운영 배포 (AWS Lightsail + k3s + Argo CD)

구성 (2026-10-12 결정)

- 서버: Lightsail 서울(ap-northeast-2) Linux $12 플랜(2GB, 2 vCPU, SSD 60GB) 1대 + 고정 IP
- 쿠버네티스: k3s 1대(서버 겸 작업 노드). 기본 Traefik은 끄고 Caddy가 HTTPS·화면 제공
- 배포: GitOps. `main` push → GitHub Actions(테스트·이미지 빌드·GHCR 업로드·`deploy/k8s` 이미지 태그 커밋) → Argo CD가 서버에 반영
- 서버는 빌드하지 않음 (Lightsail 버스트형 CPU 크레딧 보호)
- 외부 공개는 80/443(Caddy)만. PostgreSQL·SeaweedFS는 클러스터 안에서만. SSH는 Tailscale로만

```
git push main
  └ GitHub Actions: 테스트 → 이미지 → GHCR → deploy/k8s/kustomization.yaml 태그 커밋
                                                      │
Lightsail(k3s) ── Argo CD가 Git을 보고 맞춤 ◀─────────┘
  ├ web(Caddy :80/:443) ── /api, /oauth2, /login/oauth2 → backend(Spring :8080)
  ├ postgres (PVC 5Gi)      └ 그 외 → 화면 파일
  ├ seaweedfs (PVC 20Gi)
  └ postgres-backup (매일 03:00 pg_dump → /var/backups/zoolog)
```

메모리 (2GB): k3s 약 500MB, Argo CD core 약 300MB, 앱 상한 합계 약 1.3GB. 빠듯하므로 스왑 2GB를 만들고, 부족하면 $24(4GB) 플랜으로 올림

## 처음 한 번: 서버 준비

### 1. Lightsail 인스턴스

1. Lightsail 콘솔 → 인스턴스 만들기: 서울, Linux/Unix, OS만 Ubuntu 24.04 LTS, $12 플랜
2. 네트워킹 → 고정 IP 만들기 → 인스턴스에 연결
3. 네트워킹 → IPv4 방화벽: HTTP(80), HTTPS(443) 추가. SSH(22)는 Tailscale 연결 확인 후 삭제 (3번)
4. 스냅샷 → 자동 스냅샷 켜기 (매일, 백업)

### 2. 기본 설정 (Lightsail 브라우저 SSH로)

```bash
# 스왑 2GB: 메모리가 잠깐 넘칠 때 프로세스가 강제 종료되지 않도록
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Tailscale (SSH 전용 통로)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh
```

- 노트북에서 `ssh ubuntu@<서버 Tailscale 이름>` 접속 확인
- 확인되면 Lightsail 방화벽에서 SSH(22) 규칙 삭제 → 인터넷에서 SSH 불가, Tailscale로만 접속

### 4. k3s

```bash
# Traefik 끔(Caddy 사용), kubeconfig를 ubuntu 사용자도 읽을 수 있게
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik --write-kubeconfig-mode 644" sh -
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc && source ~/.bashrc
kubectl get nodes   # Ready 확인
```

### 5. Argo CD (core: 화면 없이 핵심만, 메모리 절약)

```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.5/manifests/core-install.yaml
kubectl -n argocd get pods   # 모두 Running 확인

# core 설치에는 default 프로젝트를 만드는 argocd-server가 없어 직접 생성
# (없으면 앱이 "Application referencing project default which does not exist"로 Unknown)
kubectl apply -n argocd -f - <<'EOF'
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  sourceRepos: ['*']
  destinations:
    - namespace: '*'
      server: '*'
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
EOF
```

- 저장소가 비공개(private)면 Argo CD가 읽을 수 있게 저장소 접근 정보 등록 (GitHub fine-grained 토큰, Contents 읽기):

```bash
kubectl -n argocd create secret generic zoolog-repo \
  --from-literal=type=git \
  --from-literal=url=https://github.com/kimzoo5676-del/Zoolog.git \
  --from-literal=username=kimzoo5676-del \
  --from-literal=password=<GitHub 토큰>
kubectl -n argocd label secret zoolog-repo argocd.argoproj.io/secret-type=repository
```

### 6. 비밀값 (Git에 넣지 않음)

```bash
kubectl create namespace zoolog
# deploy/zoolog-env.example을 참고해 서버에서 zoolog.env 작성 (새 강한 비밀번호 사용)
kubectl -n zoolog create secret generic zoolog-env --from-env-file=zoolog.env
shred -u zoolog.env

# GHCR 이미지가 비공개일 때만 내려받기용 (GitHub classic 토큰, read:packages 권한)
# 이 경우 backend.yaml, web.yaml 파드 spec에 imagePullSecrets: [{name: ghcr}]도 추가 (현재 이미지는 공개라 없음)
kubectl -n zoolog create secret docker-registry ghcr \
  --docker-server=ghcr.io --docker-username=kimzoo5676-del --docker-password=<GitHub 토큰>
```

- `DOMAIN`: 가비아 도메인 (예: `zoolog.kr`), `ACME_EMAIL`: 인증서 만료 알림 받을 메일

### 7. 도메인·Google 로그인

- 가비아 DNS 관리: A 레코드 `@` → 고정 IP (필요하면 `www`도)
- Google Cloud 콘솔 → OAuth 클라이언트 → 승인된 리디렉션 URI에 `https://<도메인>/login/oauth2/code/google` 추가

### 8. GitHub

- 저장소를 GitHub에 올림 (`kimzoo5676-del/Zoolog`, 다른 이름이면 `deploy/argocd/zoolog.yaml`, `deploy/k8s/kustomization.yaml`의 주소 수정)
- Settings → Actions → General → Workflow permissions: Read and write (이미지 태그 커밋용)
- 첫 push 후 Actions가 끝나면 `deploy/k8s/kustomization.yaml`의 태그가 커밋 SHA로 바뀜

### 9. Argo CD에 앱 등록 (최초 1회)

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/kimzoo5676-del/Zoolog/main/deploy/argocd/zoolog.yaml
# 비공개 저장소면 저장소를 내려받은 뒤 kubectl apply -n argocd -f deploy/argocd/zoolog.yaml
kubectl -n argocd get application zoolog    # SYNC STATUS Synced, HEALTH Healthy 확인
kubectl -n zoolog get pods
```

브라우저에서 `https://<도메인>` 접속 (첫 접속 때 Caddy가 인증서 발급, 수십 초 걸릴 수 있음)

## 평소 운영

| 하고 싶은 일 | 방법 |
|---|---|
| 배포 | `main`에 push. Actions → 태그 커밋 → Argo CD가 약 3분 안에 반영 |
| 되돌리기 | 태그 커밋(`chore: 이미지 태그 … 배포`)을 `git revert` 후 push |
| 상태 | `kubectl -n argocd get application zoolog`, `kubectl -n zoolog get pods` |
| 로그 | `kubectl -n zoolog logs deploy/backend -f` (화면 서버는 `deploy/web`) |
| 메모리 | `free -h`, `kubectl top pods -A` |
| 백업 확인 | `ls -lh /var/backups/zoolog` (매일 03:00, 14일 보관) + Lightsail 스냅샷 |
| 즉시 백업 | `kubectl -n zoolog create job --from=cronjob/postgres-backup backup-now` |

DB 복원 (백업 파일에서)

```bash
gunzip -c /var/backups/zoolog/zoolog-YYYYMMDD-HHMM.sql.gz | \
  kubectl -n zoolog exec -i statefulset/postgres -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## 개발 DB 내용을 운영으로 옮기기 (2026-10-13 실행 완료, 처음 한 번)

필요한 행만 COPY로 뽑아 SQL 파일로 만든 뒤(테스트 글 제외, `member`는 운영 로그인 때 생기므로 제외), 시험용 DB에서 먼저 넣어 보고 운영에 적용

```bash
# 1. 개발 컨테이너: dev-data.sql 생성 (Git 제외 파일). 시험용 DB에 V1~V4 적용 후 넣어 보기
# 2. Windows PowerShell: 컨테이너 → Windows → 서버
docker cp <app 컨테이너 이름>:/workspaces/zoolog/dev-data.sql $HOME\dev-data.sql
scp $HOME\dev-data.sql ubuntu@zoolog:~/
# 3. 서버: 백업 → 비어 있는지 확인 → 한 트랜잭션으로 넣기 → 파일 삭제
kubectl -n zoolog create job --from=cronjob/postgres-backup backup-before-import
kubectl -n zoolog exec postgres-0 -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select count(*) from category; select count(*) from post"'
kubectl -n zoolog exec -i postgres-0 -- sh -c 'psql -v ON_ERROR_STOP=1 -1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < dev-data.sql
rm dev-data.sql
```

- `GENERATED ALWAYS` 식별 열도 COPY로는 원래 id 그대로 들어감, 이후 `setval`로 번호 이어 붙임
- 이미지 파일(SeaweedFS)은 옮기지 않음 (옮긴 글에 이미지 없음)

## 플랜 변경: 2GB → 4GB ($24) 이전 (2026-11 진행)

Lightsail은 플랜을 그 자리에서 키울 수 없어 스냅샷으로 새 인스턴스를 만듦. 배경: 2GB에서 메모리 부족 · 스왑으로 서버가 멈춤(2026-10-30, 11-03 장애, `docs/portfolio/troubleshooting.md`)

**함정:** 새 인스턴스는 서버 이름(호스트명)과 내부 IP가 바뀜. k3s의 PVC(postgres · seaweedfs 데이터, Caddy 인증서)는 local-path라 **옛 노드 이름 `ip-172-26-13-151`에 묶여** 있음 → k3s를 옛 노드 이름으로 고정해야 데이터가 그대로 붙음. Tailscale도 스냅샷에 상태가 들어 있어 옛 인스턴스와 동시에 켜면 충돌 → 옛 인스턴스를 먼저 중지

예상 중단: 옛 인스턴스 중지부터 새 인스턴스 준비까지 약 20 ~ 40분 (소유자 재로그인 필요)

1. **백업 확인 (옛 서버)**: `kubectl -n zoolog create job --from=cronjob/postgres-backup backup-before-move` → `ls -lh /var/backups/zoolog`로 새 파일 확인 (백업 파일도 디스크에 있어 스냅샷에 함께 들어감)
2. **스냅샷 (콘솔)**: 인스턴스 → Snapshots → Create snapshot (이름 예: `zoolog-before-4gb`). 완료될 때까지 기다림
3. **옛 인스턴스 중지 (콘솔)**: Stop. 여기서부터 사이트 중단
4. **새 인스턴스 만들기 (콘솔)**: Snapshots에서 방금 스냅샷 → Create new instance → 같은 서울 리전, 플랜 $24(4GB · 2 vCPU · 80GB), 이름 예: `zoolog-4gb`
5. **새 인스턴스 접속**: 콘솔의 브라우저 SSH(Connect using SSH, 새 인스턴스는 22번이 기본으로 열려 있음) 또는 Tailscale(`ssh ubuntu@zoolog`, 같은 Tailscale 이름으로 다시 붙음)
6. **k3s 노드 이름 고정 (새 서버)**:
   ```bash
   sudo systemctl stop k3s
   echo 'node-name: ip-172-26-13-151' | sudo tee -a /etc/rancher/k3s/config.yaml
   sudo systemctl start k3s
   sleep 60; kubectl get nodes
   ```
   새 이름(`ip-172-26-…`)의 노드가 하나 더 보이면 지움: `kubectl delete node <새 이름>`. `ip-172-26-13-151`이 `Ready`면 성공
7. **파드 확인 (새 서버)**: `kubectl -n zoolog get pods` 모두 Running · Ready (몇 분 걸림), `free -m`으로 4GB 확인
8. **고정 IP 옮기기 (콘솔)**: Networking → Static IP → 옛 인스턴스에서 Detach → 새 인스턴스에 Attach. 주소가 그대로라 DNS(가비아)는 바꾸지 않음
9. **방화벽 (콘솔, 새 인스턴스 Networking)**: IPv4 · IPv6 모두 HTTP 80 · HTTPS 443 허용. Tailscale 접속이 확인되면 SSH 22 삭제
10. **확인**: https://zoolog.site 화면 · 글 목록 · 이미지 · 로그인 → 다음 정각 기사 메일 · 07:00 알림 메일
11. **자동 스냅샷 켜기 (콘솔, 새 인스턴스 Snapshots 탭)**: 자동 스냅샷 설정은 스냅샷으로 만든 인스턴스로 따라오지 않음(2026-11-03 이전 때 꺼져 있었음). DB 백업(03:00)과 겹치지 않는 시간으로
12. **정리**: 이상 없으면 옛 인스턴스 삭제 (Lightsail은 중지한 인스턴스도 요금이 나감). 옛 인스턴스의 자동 스냅샷은 함께 지워지고 수동 스냅샷은 남으므로, 수동 스냅샷이 있는지 먼저 확인. 수동 스냅샷은 한동안 보관(GB당 소액)

되돌리기: 새 인스턴스에서 문제가 생기면 고정 IP를 옛 인스턴스로 다시 붙이고 옛 인스턴스를 시작 (새 인스턴스는 중지)
