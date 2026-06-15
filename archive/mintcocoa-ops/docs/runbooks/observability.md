# Observability

Production observability is intentionally compact because the current OKE node
pool is small.

## Components

- `metrics-server` for `kubectl top`
- `kube-prometheus-stack` for metrics, dashboards, and alerts
- `loki` for log storage
- `promtail` for node log shipping
- `tempo` for trace ingestion and querying

## Storage

The current production observability stack is configured without persistent
volumes to keep the free-tier footprint small. Metrics, logs, traces, and
dashboard runtime state are ephemeral and may be lost when pods restart.

Ephemeral components:

- Grafana
- Prometheus
- Alertmanager
- Loki
- Tempo

## Retention

- Prometheus: 3 days or 8 GB
- Loki: 72 hours
- Tempo: 24 hours
- Alertmanager: 24 hours

Tune these only after checking OKE cost and volume usage.

## Private Access

Grafana is the only observability UI exposed through ingress. It uses the
private ingress controller and an OCI internal Load Balancer:

```text
URL: http://grafana.mintcocoa.dev
IngressClass: private-nginx
Private LB IP: 10.30.4.91
```

Home LAN clients resolve `grafana.mintcocoa.dev` through internal DNS and reach the load
balancer through the OCI Site-to-Site IPSec path. Prometheus, Loki, Tempo, and
Alertmanager stay as ClusterIP services behind Grafana.
