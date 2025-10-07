# CI/CD

## CI (GitHub Actions)
Workflow in `.github/workflows/ci.yml` builds backend and frontend and Docker image.

## CD
- Push images to ECR; ArgoCD watches manifests repo for K8s rollout.

## Environments
- dev → staging → prod; feature branches deploy previews.

## Safeguards
- Required checks; canary or blue/green; migration gating; rollback automation.
