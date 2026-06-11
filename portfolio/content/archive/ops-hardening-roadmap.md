# Homelab Ops Hardening Roadmap

Last updated: 2026-04-28

This checklist tracks the remaining infrastructure hardening work separately
from the public portfolio narrative.

| Area | Current improvement | Remaining work |
|---|---|---|
| GitOps secrets | Added SOPS/age convention and restic secret template | Add real age recipient, encrypt actual secrets, and wire Argo CD decryption |
| NFS/PV backup | Added restic CronJob manifest for the NFS PV root | Apply after encrypted `storage-backup/nfs-pv-backup-restic` secret exists, then test restore |

## Verification Commands

```bash
git status --short
kubectl apply -f deploy/nfs-pv-backup-cronjob.yaml
kubectl -n storage-backup create job --from=cronjob/nfs-pv-restic-backup nfs-pv-restic-backup-smoke
kubectl -n storage-backup logs job/nfs-pv-restic-backup-smoke
```

Do not run the Kubernetes commands until the encrypted restic secret is
prepared.
