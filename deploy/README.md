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
```

- 저장소가 비공개(private)면 Argo CD가 읽을 수 있게 저장소 접근 정보 등록 (GitHub fine-grained 토큰, Contents 읽기):

```bash
kubectl -n argocd create secret generic zoolog-repo \
  --from-literal=type=git \
  --from-literal=url=https://github.com/kimzoo5676/zoolog.git \
  --from-literal=username=kimzoo5676 \
  --from-literal=password=<GitHub 토큰>
kubectl -n argocd label secret zoolog-repo argocd.argoproj.io/secret-type=repository
```

### 6. 비밀값 (Git에 넣지 않음)

```bash
kubectl create namespace zoolog
# deploy/zoolog-env.example을 참고해 서버에서 zoolog.env 작성 (새 강한 비밀번호 사용)
kubectl -n zoolog create secret generic zoolog-env --from-env-file=zoolog.env
shred -u zoolog.env

# GHCR 이미지가 비공개면 내려받기용 (GitHub 토큰, read:packages 권한)
kubectl -n zoolog create secret docker-registry ghcr \
  --docker-server=ghcr.io --docker-username=kimzoo5676 --docker-password=<GitHub 토큰>
```

- `DOMAIN`: 가비아 도메인 (예: `zoolog.kr`), `ACME_EMAIL`: 인증서 만료 알림 받을 메일

### 7. 도메인·Google 로그인

- 가비아 DNS 관리: A 레코드 `@` → 고정 IP (필요하면 `www`도)
- Google Cloud 콘솔 → OAuth 클라이언트 → 승인된 리디렉션 URI에 `https://<도메인>/login/oauth2/code/google` 추가

### 8. GitHub

- 저장소를 GitHub에 올림 (`kimzoo5676/zoolog`, 다른 이름이면 `deploy/argocd/zoolog.yaml`, `deploy/k8s/kustomization.yaml`의 주소 수정)
- Settings → Actions → General → Workflow permissions: Read and write (이미지 태그 커밋용)
- 첫 push 후 Actions가 끝나면 `deploy/k8s/kustomization.yaml`의 태그가 커밋 SHA로 바뀜

### 9. Argo CD에 앱 등록 (최초 1회)

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/kimzoo5676/zoolog/main/deploy/argocd/zoolog.yaml
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

## 개발 DB 내용을 운영으로 옮기기 (선택, 처음 한 번)

```bash
# 개발 컨테이너에서
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" --data-only \
  --exclude-table=flyway_schema_history > dev-data.sql
# 서버로 복사(scp, Tailscale) 후 서버에서 (운영 앱이 한 번 떠서 Flyway가 표를 만든 뒤)
kubectl -n zoolog exec -i statefulset/postgres -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < dev-data.sql
```

이미지 파일(SeaweedFS)은 아직 없으므로 옮길 필요 없음
