# Staging-First Promotion Evidence

이 문서는 `dropapp`을 예제로 staging-first GitOps promotion 흐름을 캡처한 자료입니다. 핵심은 app commit SHA가 image tag가 되고, 그 tag가 먼저 staging overlay에 들어간 뒤, 같은 tag만 prod overlay로 승격된다는 점입니다.

이번 캡처에서 사용한 예제 tag:

```text
5c28a7563537451b23e9ec5c61b8e7a43549ddc0
```

## 1. App Commit과 Overlay 상태

`iouring-runtime`의 현재 commit SHA를 image tag로 보고, `dropapp` staging/prod overlay의 `newTag` 상태를 확인합니다.

![App commit and overlay tags](../evidence/staging-first-01-source-and-overlays.png)

## 2. Staging Update PR 변경 범위

앱 저장소 CI가 GHCR image를 push한 뒤 열어야 하는 PR은 staging overlay의 image tag만 바꾸는 형태입니다.

![Staging update diff](../evidence/staging-first-02-staging-update-diff.png)

## 3. Staging Render 검증

staging overlay는 home k3s의 `staging-services` namespace와 NodePort 노출을 사용합니다. CI는 cluster에 직접 apply하지 않고, render validation과 PR 생성까지만 담당합니다.

![Staging render](../evidence/staging-first-03-staging-render.png)

## 4. Prod Promotion PR 변경 범위

prod promotion은 새 tag를 임의로 입력하지 않고, staging overlay에서 검증된 같은 tag를 prod overlay로 복사합니다.

![Prod promotion diff](../evidence/staging-first-04-prod-promotion-diff.png)

## 5. Prod Render 검증

prod overlay는 OKE production의 `prod-services` namespace, public ingress, production replica/resource/security patch를 사용합니다.

![Prod render](../evidence/staging-first-05-prod-render.png)

## 6. Cluster Root Render 검증

마지막으로 staging root와 prod workloads root가 모두 render되는지 확인합니다. 이 단계는 PR validation에서 같은 종류의 정적 검증으로 수행됩니다.

![Cluster root render](../evidence/staging-first-06-cluster-root-render.png)

## Note

현재 로컬 WSL 환경에서는 Docker Desktop WSL integration이 비활성화되어 있어 실제 container build/push 캡처는 수행하지 않았습니다. 실제 운영 흐름에서는 애플리케이션 저장소 CI가 image build와 GHCR push를 담당하고, `mintcocoa-ops`에는 staging/prod overlay PR만 남깁니다.
