# kubectl 자주 쓰는 명령

`kubectl`: 쿠버네티스 API 서버에 명령을 보내는 도구. 기본 모양 `kubectl <동사> <자원 종류> [이름] [-n 네임스페이스]`

이 서버 기준 네임스페이스: 앱 `zoolog`, Argo CD `argocd`, k3s 기본 구성 요소 `kube-system`

## 용어

| 용어 | 뜻 |
| --- | --- |
| 클러스터(Cluster) | 쿠버네티스가 관리하는 서버 묶음. 이 프로젝트는 서버 1대(노드 1개) |
| 노드(Node) | 파드가 실제로 실행되는 서버 |
| 파드(Pod) | 실행의 가장 작은 단위. 컨테이너 1개 이상을 감싼 것. 일회용(교체되면 이름·IP가 바뀜) |
| 디플로이먼트(Deployment) | "이 이미지로 파드 N개"를 선언하면 개수 유지와 교체(배포)를 맡는 관리자. 무상태 앱용(backend, web) |
| 레플리카셋(ReplicaSet) | Deployment가 버전마다 만드는 파드 묶음 관리자. 직접 다룰 일은 거의 없음 |
| 스테이트풀셋(StatefulSet) | 이름(`postgres-0`)과 저장 공간이 고정되는 파드 관리자. DB처럼 상태가 있는 앱용 |
| 서비스(Service) | 바뀌는 파드들 앞의 고정 주소. `backend:8080`처럼 이름으로 접근. ClusterIP(안에서만), LoadBalancer(외부 공개) |
| PVC(PersistentVolumeClaim) | "저장 공간 N GB 주세요" 요청. 파드가 바뀌어도 데이터 유지 |
| 시크릿(Secret) / 컨피그맵(ConfigMap) | 비밀값 / 일반 설정값을 파드에 환경 변수·파일로 전달 |
| 네임스페이스(Namespace) | 클러스터 안의 구역. 이름 충돌 방지와 권한 구분 |
| 크론잡(CronJob) | 정해진 시각에 파드를 실행하는 작업 (예: 매일 03:00 DB 백업) |
| 프로브(Probe) | 컨테이너 상태 검사. startup(켜졌나), readiness(요청 받을 준비 됐나), liveness(살아 있나) |
| 롤아웃(Rollout) | Deployment가 새 버전으로 파드를 교체하는 과정 |

## 상태 보기 (가장 자주 씀)

```bash
kubectl get pods -n zoolog                 # 파드 목록과 상태 (Running, Pending, CrashLoopBackOff)
kubectl get pods -n zoolog -o wide         # + 파드 IP, 실행 노드
kubectl get pods -n zoolog -w              # 변화를 계속 지켜봄 (Ctrl+C로 종료)
kubectl get all -n zoolog                  # 파드·서비스·디플로이먼트 등 한 번에
kubectl get pods -A                        # 모든 네임스페이스
kubectl get nodes                          # 노드 상태 (Ready)
kubectl get svc,pvc -n zoolog              # 서비스, 저장 공간
kubectl get events -n zoolog --sort-by=.lastTimestamp   # 최근 사건 (이미지 받기 실패, 메모리 초과 등)
```

## 문제 찾기

```bash
kubectl describe pod <파드 이름> -n zoolog          # 상세 정보, 맨 아래 Events가 핵심 (왜 안 뜨는지)
kubectl logs deploy/backend -n zoolog --tail=100    # 로그 마지막 100줄
kubectl logs deploy/backend -n zoolog -f            # 로그 실시간 (Ctrl+C로 종료)
kubectl logs deploy/backend -n zoolog --previous    # 재시작 전(죽기 직전) 로그
kubectl top pods -n zoolog                          # 파드별 CPU·메모리 사용량
kubectl top nodes                                   # 서버 전체 사용량
kubectl exec -it deploy/backend -n zoolog -- sh     # 컨테이너 안으로 들어가기 (exit로 나옴)
```

자주 보는 상태

| 상태 | 뜻 | 먼저 볼 것 |
| --- | --- | --- |
| `Pending` | 실행할 자리를 못 찾음 | `describe`의 Events (메모리 부족, PVC 대기) |
| `ImagePullBackOff` | 이미지를 못 받음 | 이미지 이름·태그, 비공개 이미지 권한 |
| `CrashLoopBackOff` | 실행했다가 계속 죽음 | `logs --previous` |
| `OOMKilled` | 메모리 상한 초과로 강제 종료 | `describe`의 Last State, `resources.limits` |
| `Running` + READY `0/1` | 실행 중이지만 준비 검사 실패 | readinessProbe, 로그 |

## 배포 · 교체

```bash
kubectl rollout status deploy/web -n zoolog         # 배포 진행 상황 (끝날 때까지 대기)
kubectl rollout history deploy/web -n zoolog        # 배포 이력
kubectl rollout restart deploy/backend -n zoolog    # 같은 이미지로 파드 다시 시작
kubectl apply -f <파일>                              # YAML 내용대로 만들거나 고침 (선언형)
kubectl apply -k deploy/k8s                         # kustomize 폴더 적용
kubectl diff -k deploy/k8s                          # 적용하면 무엇이 바뀌는지 미리 보기
kubectl delete pod <파드 이름> -n zoolog             # 파드 삭제 → Deployment가 새로 만듦 (재시작 용도)
```

이 프로젝트는 Argo CD가 Git 내용대로 맞추므로(selfHeal) `kubectl apply`·`edit`·`scale`로 바꾼 설정은 되돌려짐. 설정 변경은 Git의 `deploy/k8s`를 고쳐 push. 위 명령은 확인·재시작 용도로 사용

## Argo CD (core 설치라 kubectl로 확인)

```bash
kubectl get application -n argocd                   # SYNC(Synced/OutOfSync), HEALTH(Healthy/Progressing/Degraded)
kubectl -n argocd get application zoolog -o jsonpath='{range .status.conditions[*]}{.type}: {.message}{"\n"}{end}'   # 오류 메시지
kubectl -n argocd annotate application zoolog argocd.argoproj.io/refresh=hard --overwrite   # Git 즉시 다시 확인
```

## 기타

```bash
kubectl get secret zoolog-env -n zoolog             # 비밀값 존재 확인 (값은 출력하지 않기)
kubectl -n zoolog create job --from=cronjob/postgres-backup backup-now   # 백업 즉시 실행
kubectl explain deployment.spec.strategy            # 필드 설명 (공식 문서 대신 빠르게)
kubectl get pod <이름> -n zoolog -o yaml             # 실제 적용된 전체 설정
```

자주 쓰는 줄임말: `po`(pods), `deploy`(deployments), `svc`(services), `ns`(namespaces), `sts`(statefulsets), `cm`(configmaps), `-A`(모든 네임스페이스), `-o wide/yaml/json`(출력 형식)

참고: [kubectl 빠른 참조(공식)](https://kubernetes.io/ko/docs/reference/kubectl/quick-reference/)
