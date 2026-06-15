# Bootstrap OKE Production

This runbook assumes the GitOps manager Argo CD is available and the OKE/prod kubeconfig is configured locally.

## 1. Verify Cluster Access

```bash
kubectl config current-context
kubectl get nodes -o wide
```

Expected cluster:

```text
home-oci-oke-cluster
```

## 2. Verify GitOps Manager Argo CD

Production is reconciled by Argo CD running on the GitOps manager management k3s, not by a production workload inside OKE.

```bash
argocd --core --kube-context mintcocoa-manager-local cluster list
```

Expected cluster registration:

```text
mintcocoa-prod
```

## 3. Create Required Runtime Secrets

Grafana requires an admin Secret before syncing the observability stack:

```bash
kubectl create namespace observability
kubectl -n observability create secret generic observability-grafana-admin \
  --from-literal=admin-user=admin \
  --from-literal=admin-password='<strong password>'
```

`dropapp` requires a bearer token for uploads and deletes. Store the token as a
Kubernetes Secret, not in Git:

```bash
kubectl create namespace prod-services
kubectl -n prod-services create secret generic dropapp-auth \
  --from-literal=token='<strong upload token>'
```

Use the same Secret name in staging if syncing the staging overlay:

```bash
kubectl --context <staging-context> create namespace staging-services
kubectl --context <staging-context> -n staging-services create secret generic dropapp-auth \
  --from-literal=token='<strong upload token>'
```

## 4. Apply Root Application

After this branch is merged to `main`:

```bash
kubectl --context mintcocoa-manager-local apply -f bootstrap/prod-root.yaml
```

The root Application and self-referencing child Applications target `main`.

## 5. Sync Order

Sync in this order if doing it manually:

1. `metrics-server`
2. `observability-stack`
3. `loki`
4. `promtail`
5. `tempo`
6. `grafana-datasources`
7. `cert-manager`
8. `ingress-nginx`
9. `cluster-issuers`
10. `prod-dropapp`

After `ingress-nginx` creates its LoadBalancer Service, point
`drop.mintcocoa.dev` at the external address:

```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller
```

## 6. Validate

```bash
kubectl top nodes
kubectl get pods -n observability
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl get pods -n ingress-nginx
kubectl get pods -n cert-manager
kubectl get ingress -n prod-services dropapp
kubectl get certificate -n prod-services dropapp-tls
```

Then test Grafana with port-forwarding:

```bash
kubectl -n observability port-forward svc/observability-grafana 3000:80
```

Then test the public workload:

```bash
curl -fsS https://drop.mintcocoa.dev/healthz
curl -H "Authorization: Bearer ${DROPAPP_AUTH_TOKEN}" https://drop.mintcocoa.dev/api/files
```
