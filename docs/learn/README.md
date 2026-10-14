# 학습 노트

Zoolog를 만들고 운영하면서 생긴 질문을 하나씩 풀어 쓴 글입니다. 질문은 실제로 나온 그대로 옮겼습니다.

각 글은 같은 순서로 되어 있습니다.

1. 나온 질문
2. 답부터
3. 그림과 표로 왜 그런지
4. 이 저장소에서 직접 확인하는 방법
5. 출처

| 번호 | 질문 | 다루는 것 |
| --- | --- | --- |
| [01](01-zero-downtime.md) | 백엔드도 무중단 배포를 해야 할까 | Recreate와 RollingUpdate, 메모리, 세션 |
| [02](02-transaction-boundary.md) | 트랜잭션을 어떻게 하자는 거지? | DB 밖 작업, 동시 요청, flush 시점 |
| [03](03-curl-ok-app-fails.md) | curl은 200인데 왜 앱은 못 읽나 | Content-Type과 HttpMessageConverter |
| [04](04-shared-images.md) | 한 이미지를 여러 글이 함께 쓰면 | 다대다 연결 테이블, 정리 기준 시각 |
| [05](05-scale-out-prerequisites.md) | 백엔드를 2개로 늘리면 무엇이 깨지나 | 세션, 예약 작업 중복, CPU requests |
| [06](06-backup-where.md) | 백업이 같은 서버 안에만 있다는 게 무슨 말이야 | pg_dump와 스냅샷이 막는 사고, 자동 스냅샷의 함정 |

서버 명령은 [kubectl 자주 쓰는 명령](../kubectl-cheatsheet.md)에, 무엇을 왜 골랐는지는 [기술적 결정 기록](../portfolio/decisions.md)에 있습니다.
