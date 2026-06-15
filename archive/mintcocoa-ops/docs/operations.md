# Operations

## Production Rule

Production is the prod environment on OKE. Staging k3s can be used to test manifests and rehearse recovery,
but production services must not require the home lab to be online.

## Promotion Rule

Deploy to dev first, validate, then promote the image or overlay change to
prod. The repository provides a manual GitHub Actions workflow named
`Promote staging overlay to prod` for image-tag promotion.

## Grafana

Port-forward:

```bash
kubectl -n observability port-forward svc/observability-grafana 3000:80
```

Open:

```text
http://127.0.0.1:3000
```

The admin password is stored in the Kubernetes Secret
`observability/observability-grafana-admin`, not in Git.

## Useful Checks

```bash
kubectl get nodes -o wide
kubectl top nodes
kubectl get pods -n observability
kubectl get pvc -n observability
```

Prometheus health:

```bash
kubectl -n observability port-forward svc/kube-prometheus-stack-prometheus 9090:9090
```

Loki labels:

```bash
kubectl -n observability port-forward svc/loki-gateway 3100:80
curl -fsS http://127.0.0.1:3100/loki/api/v1/labels
```

Tempo readiness:

```bash
kubectl -n observability port-forward svc/tempo 3200:3200
curl -fsS http://127.0.0.1:3200/ready
```

## Admin Token Revocation

If the temporary manual-client admin ServiceAccount must be revoked:

```bash
kubectl delete clusterrolebinding external-admin-cluster-admin
kubectl delete serviceaccount external-admin -n kube-system
```
