# Deployment Checklist

- Secrets in AWS Secrets Manager/KMS; mount via CSI.
- TLS via ACM; HSTS enabled.
- Autoscaling with HPA; readiness/liveness probes.
- DB migrations before rollout; backup/restore plan.
- OTEL collector + dashboards ready.
- Runbooks & on-call; SLOs configured.
- GDPR DSR runbook (export/delete).
