Azure AKS·홈랩 기반 개발-운영 파이프라인 구축

애플리케이션 배포를 넘어 실제 운영 상황에서 문제가 발생했을 때 원인을 추적하고 통제할 수 있는 개발-운영 파이프라인을 구축했습니다. 
기존 홈랩 기반 단일 서버 환경에선 빠르게 실험하고 학습하기엔 좋지만, 실제 운영 관점에서 볼 때 트래픽 경로, 운영자 접근 권한, 배포 승인 과정, 장애 분석 흐름이 모두 동일한 경로로 섞여 있어, 문제가 발생했을 때 원인 범위를 좁히기 어려웠고, 접근과 권한이 외부 트래픽과 분리되어 있지 않아 외부 보안 통제가 어려웠습니다. 또한 개발 변경 사항이 바로 반영되는 구조에서는 어떤 변경이 어떤 검증을 거쳤는지 추적하기 어려워 누가 어떤 의도로 변경했는지 기록이 남지 않으면 장애 발생 시 원인 판단이 어려울 것이라 판단했습니다.

그래서 이 문제를 해결하기 위해 Azure AKS를 public workload 실행 환경으로 두고, 집의 라즈베리파이를 이용해 소형  k3s 클러스터를 홈랩 manager로 구성했습니다. AKS는 외부 트래픽을 처리하는 public ingress와 운영자 접근용 internal ingress를 분리하여, 외부 공격 표면과 운영자 접근 경로를 분리했습니다. 또한 GitHub Actions와 Argo CD를 이용해 staging과 production 배포 경로를 분리하고, staging에서 검증된 결과만 production으로 승격되는 구조로 만들어, 어떤 변경이 어떤 검증을 거쳐 production에 반영되었는지 추적할 수 있도록 했습니다. 장애 알림이 발생했을 때도 단순히 알림 자체만으로 판단하지 않고, 먼저 AI가 필요한 증거를 수집해 분석하도록 하여 어떤 데이터에 근거해 판단했는지 확인할 수 있도록 해 AI의 오탐 가능성을 줄이고 실제 장애 원인에 대한 판단 근거 사람이 확인할 수 있도록 했습니다.

## Repository Structure

```text

* 외부 사용자 트래픽과 운영자 접근 경로가 분리되지 않을 경우, 장애 대응 범위와 보안 통제 경계가 불명확해짐

    - AKS에서 public workload와 운영자 접근용 ingress를 분리하여, 외부 트래픽과 운영자 접근 경로를 명확히 구분
    - Grafana 등 운영자용 observability 경로는 Internal Load Balancer와 VPN 경로로 제한
    - 홈랩 manager 호스트는 Site-to-Site IPsec VPN을 통해 Azure VNet에 접근하도록 구성

* 개발 변경 사항이 곧바로 production에 반영될 경우, 변경 이력과 검증 과정을 추적 및 장애 발생시 원인 판단이 어려울 수 있음

    - staging과 production 배포 경로를 분리하여, staging에서 검증된 변경 사항만 production으로 승격되는 구조로 설계
    - GitHub Actions workflow에서 staging overlay에 먼저 변경 사항을 반영하고 자동 Sync로 검증
    - production 승격 시 promotion workflow가 staging에서 검증된 image tag만 prod overlay로 복사하도록 구성

* 배포 과정에서 “누가, 어떤 의도로, 어떤 상태를 반영했는지”가 남지 않을 경우, 장애 원인 추적이 어려워짐

    - GitHub PR과 Argo CD 수동 Sync를 통한 production 반영으로, 변경 의도와 승인 기록이 함께 남는 구조로 설계
    - PR에는 staging에서 검증된 tag와 staging/prod overlay 경로 기록
    - merge 이후 `prod-root`가 OutOfSync 상태를 표시하여 운영자가 수동 Sync로 실제 반영하도록 구성
    - 운영자가 diff, staging 응답, GitHub Actions validation 결과 확인 후 수동 Sync하도록 하여 GitHub PR에는 배포 의도와 변경 근거, Argo CD operation에는 실제 반영 기록이 남는 구조로 구성

* 실제 장애 발생시 인간이 문제를 인식하고 결정 하는 과정 중 로그와 메트릭 조회와 분석 자체가 대응 시간의 병목이 될수 있다고 판단

    - 장애 감지 상황 자체는 PrometheusRule과 Alertmanager가 담당
    - LLM은 이미 발생한 알림을 바탕으로 증거를 수집·분석해 가공된 정보를 제공하는 보조 역할로 한정
    - AI가 요청하는 Prometheus, Loki, Kubernetes 조회는 의도적으로 도구 내부에서만 실행하도록 구성하여 AI의 오탐 가능성으로 인해 실제 장애 원인 판단이 왜곡될 가능성을 줄임
    - 조회 결과와 AI 판단 근거를 trace로 남기고 Discord에 함께 전달
    - 어떤 데이터에 근거해 판단했는지 확인 가능한 구조 구성

* 단순히 동작하는 Kubernetes 클러스터가 구축에 집중하는게 아니라, 운영 중 문제가 발생했을 때 여러 경계를 나누어 추적할 수 있는 구조에 집중

    - Azure AKS, 홈랩 manager k3s, GitHub Actions, GHCR, Argo CD, Kustomize, Prometheus, Alertmanager를 하나의 운영 흐름으로 연결
    - 개발 변경, staging 검증, production 승격, 수동 승인, 장애 알림, 증거 기반 분석까지 이어지는 GitOps 기반 운영 구조 구성
    - 변경 이력, 승인 기록, 실행 상태, 장애 분석 근거가 함께 남는 운영 체계 구축
