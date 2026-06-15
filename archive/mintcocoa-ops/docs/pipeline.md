# Staging-First GitOps Promotion Pipeline

이 파이프라인은 workstation의 local-only 검증 다음 단계로 home k3s를 staging 환경으로 두고, OKE prod에는 staging에서 확인된 image tag만 PR로 승격하는 흐름을 기준으로 한다. CI는 cluster에 직접 apply하지 않는다. CI가 할 일은 image를 만들고 `mintcocoa-ops`에 desired state 변경 PR을 여는 것이며, 실제 cluster runtime 수렴은 GitOps manager 위 management k3s의 Argo CD가 담당한다.

```text
Application repo CI
  -> build and push GHCR image
  -> open staging update PR in mintcocoa-ops
  -> merge staging PR
  -> management Argo CD auto-sync to home k3s staging
  -> validate workload
  -> open prod promotion PR from current staging tag
  -> merge prod PR
  -> prod Argo CD shows OutOfSync
  -> operator manually syncs OKE prod
```

## PR Contracts

Staging update PR은 애플리케이션 저장소의 CI가 연다. 이 PR은 새로 build/push한 image tag를 staging overlay에 반영하며, 변경 범위는 원칙적으로 아래 파일 하나로 제한한다.

```text
apps/<app>/overlays/staging/kustomization.yaml
```

Prod promotion PR은 `mintcocoa-ops` 안의 `Promote staging overlay to prod PR` workflow가 연다. workflow는 prod image tag를 임의 입력으로 받지 않고, staging overlay의 현재 `newName`과 `newTag`를 읽어 prod overlay로 복사한다. 이 PR의 변경 범위도 원칙적으로 아래 파일 하나로 제한한다.

```text
apps/<app>/overlays/prod/kustomization.yaml
```

이 계약 때문에 production에서 문제가 생겼을 때 먼저 prod overlay의 image tag를 보고, 같은 tag가 staging에서 검증된 이력과 애플리케이션 저장소의 commit으로 이어지는지 추적할 수 있다.

Staging Application은 `automated` sync를 사용한다. staging PR이 merge되면 Argo CD가 home k3s에 즉시 반영해 빠른 검증 환경을 만든다. Prod Application은 의도적으로 `automated` sync를 두지 않는다. prod promotion PR merge 후 Argo CD가 `OutOfSync` 상태로 변경을 감지하면, 운영자가 diff와 staging 검증 결과를 확인한 뒤 수동 Sync로 OKE runtime에 반영한다.

## Argo CD Layout

GitOps manager VM 위의 management k3s Argo CD가 staging/prod를 함께 관리하는 primary control plane이다.

```text
bootstrap/prod-root.yaml  -> clusters/prod
bootstrap/staging-root.yaml   -> clusters/staging
```

각 원격 cluster는 Argo CD에 아래 이름으로 등록된다.

```text
mintcocoa-staging
mintcocoa-prod
```

## Current Workloads

`pipeline-demo` is the primary staging-to-prod promotion reference workload:

- Source repo: `mint-cocoa/mintcocoa-pipeline-demo`
- Staging: `apps/pipeline-demo/overlays/staging`, namespace `staging-services`, NodePort `30082`
- Prod: `apps/pipeline-demo/overlays/prod`, namespace `prod-services`, Ingress
  `demo.mintcocoa.dev`
- Image: `ghcr.io/mint-cocoa/mintcocoa-pipeline-demo:<commit-sha>`
- Runtime: Go standard library HTTP release probe

`dropapp` is the production application example:

- Staging: `apps/dropapp/overlays/staging`, namespace `staging-services`, NodePort `30081`
- Prod: `apps/dropapp/overlays/prod`, namespace `prod-services`, Ingress
  `drop.mintcocoa.dev`
- Image: `ghcr.io/mint-cocoa/dropapp:<tag>`
- Runtime: C++ `iouring-runtime` `RuntimeWeb`

`whoami` remains as a small connectivity proof:

- Staging: `apps/whoami/overlays/staging`, namespace `staging-services`, NodePort `30080`
- Prod: `apps/whoami/overlays/prod`, namespace `prod-services`, ClusterIP

Prod intentionally does not expose this proof app publicly.

`mintcocoa-docs` is currently treated as a prod-only workload in this repo. If docs also need the same staging-first promotion contract, add `apps/mintcocoa-docs/overlays/staging` and include it in the staging cluster root before wiring the app repository CI to open staging update PRs.

## App Repository CI Example

Application repositories should build the image, push it to GHCR with an immutable tag such as the commit SHA, then open a staging overlay PR in this repository. See:

```text
docs/examples/app-ci-open-staging-pr.yml
```

The example uses `OPS_REPO_TOKEN` or an equivalent GitHub App token to create a branch and PR in `mintcocoa-ops`. Do not put cluster credentials in application CI. The merge into `mintcocoa-ops` is the deployment request, and Argo CD is the actor that applies it.

For a captured `dropapp` promotion walkthrough, see `docs/staging-first-promotion-evidence.md`.

`dropapp` uploads and deletes require `DROPAPP_AUTH_TOKEN`. Create the
`dropapp-auth` Secret in each target namespace before syncing the app.

## Bootstrap Cluster Registration

From the GitOps manager Argo CD context:

```bash
argocd cluster add <staging-kube-context> --name mintcocoa-staging
argocd cluster add <prod-kube-context> --name mintcocoa-prod
kubectl apply -f bootstrap/staging-root.yaml
kubectl apply -f bootstrap/prod-root.yaml
```

If using the Argo CD CLI from a workstation, make sure the management k3s,
staging k3s, and OKE kubeconfig contexts are available locally.

See `docs/runbooks/rebuild-staging-k3s.md` for a rebuild-oriented staging bootstrap.
