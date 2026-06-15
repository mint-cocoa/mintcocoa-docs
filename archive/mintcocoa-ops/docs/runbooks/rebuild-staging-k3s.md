# Rebuild Staging k3s

This runbook is intentionally explicit because rebuilding the home lab can
delete workloads and local data.

## Target Role

Staging k3s is a staging and internal-ops cluster. It validates manifests before
promotion to OKE production.

The staging node is `cocoamini` at `172.30.1.27`.

## Reset Policy

Before wiping the cluster, confirm that no production workload depends on:

- staging node storage
- staging LAN-only services
- NodePort `30080`
- local k3s secrets

Do not install staging k3s on the Raspberry Pi IPSec CPE unless there is no
other choice. k3s changes iptables/nftables rules, and the CPE is part of the
operator access path into OCI.

## Bootstrap Sequence

1. Bring `cocoamini` online and confirm `172.30.1.27`.
2. Keep the node on a stable `172.30.1.0/24` address.
3. Install k3s without bundled ingress controllers if a separate ingress will
   be managed by GitOps later.
4. Copy the staging kubeconfig to the operator workstation and replace the
   server address with the stable LAN IP.
5. Verify access:

```bash
kubectl --context mintcocoa-staging-local get nodes -o wide
```

6. Register staging in the GitOps manager Argo CD control plane. Run this from
   an environment that can reach both the management k3s API and the staging
   k3s API:

```bash
argocd cluster add mintcocoa-staging-local --name mintcocoa-staging
```

7. Apply the staging root Application to the GitOps manager Argo CD control
   plane:

```bash
kubectl --context mintcocoa-manager-local apply -f bootstrap/staging-root.yaml
```

8. Verify the staging proof apps:

```bash
kubectl --context mintcocoa-staging-local -n staging-services get pods,svc
curl http://172.30.1.27:30080
curl http://172.30.1.27:30082
```

## Expected GitOps Apps

- `staging-whoami`
- `staging-gitops-demo`
- `staging-dropapp`

The staging root intentionally stays small. k3s already includes a metrics-server
add-on, so it is not managed as a separate Argo CD Application here. Add more
staging-only services only after the production promotion path is stable.

## Current Cleanup State

The old local kubeconfig context that pointed at the removed `192.168.0.0/24`
LAN has been removed. `mintcocoa-staging-local` now points at
`https://172.30.1.27:6443`. If the GitOps manager cannot reach
`172.30.1.27:6443`, confirm that `cocoamini` has a return route for
`10.30.0.0/16` through the Raspberry Pi IPSec CPE:

```bash
ip route get 10.30.6.10
```

Also confirm that the Raspberry Pi CPE is using the working OCI tunnel. The
current working path keeps `oci-tunnel-2` active and leaves `oci-tunnel-1`
disabled on the CPE, because tunnel-1 was observed to accept outbound traffic
without returning data-plane responses.
