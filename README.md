{{ ... }}

An enterprise-grade, multi-tenant platform unifying omnichannel messaging, intelligent automation, and AI conversation intelligence.

## Quickstart

- Backend (Node 20 recommended):
  1) Copy `backend/.env.example` to `backend/.env` and adjust values as needed.
  2) Install dependencies: `cd backend && npm install`
  3) Start API locally: `npm run dev`
  4) smoke test endpoint:
     - `POST http://localhost:4000/v1/contacts` with header `x-workspace-id: demo-ws`
     - Body: `{ "displayName": "Jane Doe", "email": "jane@example.com" }`

- Frontend:
  1) Install dependencies: `cd frontend && npm install`
  2) Run the Vite dev server: `npm run dev`
  3) Open http://localhost:5173 in your browser

## Docker Compose Development Environment

- **Prerequisites**: Docker Desktop (or any Docker engine) running with access to Node 20 compatible images.
- **Build & start**:
  ```bash
  docker-compose up --build
  ```
  - This uses the `dev` stages defined in `backend/Dockerfile` and `frontend/Dockerfile`.
  - Each `dev` stage seeds dependencies into `/opt/node_modules` during image build. On container start, `docker-entrypoint.dev.sh` copies those modules into the bind-mounted `/app/node_modules` only when empty, so restarts skip reinstalling packages.
  - Named volumes `backend-node-modules` and `frontend-node-modules` keep container-specific dependencies isolated from the host.
- **Endpoints**:
  - Backend: `http://localhost:4000/healthz`
  - Frontend: `http://localhost:5173`
- **Stopping**:
  ```bash
  docker-compose down
  ```
- **Hot reload**: Because `/app` is bind mounted, local file edits trigger the usual `npm run dev` watchers inside the containers without rebuilding images.

## Delivery Governance

- **Backlog source**: Jira Software project `PraisePoint E Commerce` (`https://praisegovaya.atlassian.net`).
- **Board columns**: `Backlog → Ready → In Progress → Code Review → QA → Done`. Move issues across columns as work progresses.
- **GitHub integration**: The repository connects via the "GitHub for Atlassian" app. Install at `https://github.com/apps/github-for-atlassian` (only selected repos) and manage the link inside Jira under `Apps → Manage apps → GitHub for Atlassian`.
- **Branch/PR naming**: Include the Jira key in branches, commit messages, and PR titles (e.g., `KAN-7 backfill governance docs`). This enables automatic syncing of development activity back into Jira.

## Project Structure

- backend/ — TypeScript Express API (multi-tenant via `x-workspace-id` header)
- frontend/ — React + Tailwind starter UI (Inbox, Contacts, Workflows, Broadcasts)
- docs/ — PRD, OpenAPI, Schema, DSL, Architecture

## Testing

- Backend unit/integration tests (Vitest + Supertest):
  ```bash
  cd backend
  npm run test
  ```
  All tests expect `NODE_ENV=test` defaults and run against the in-memory data store.

- Backend type-check/build verification:
  ```bash
  npm run build
  ```

- Frontend component tests (Vitest + Testing Library):
  ```bash
  cd frontend
  npm test -- --run
  ```
  These tests mock API client calls and rely on jsdom polyfills configured in `vitest.setup.ts`.

- Optional coverage reporting:
  ```bash
  npm test -- --coverage
  ```

## Continuous Integration

GitHub Actions workflows live in `.github/workflows/`:

- `ci.yml` runs on pushes/PRs against `main` and executes both backend and frontend build + test jobs on Node 20. It installs dev dependencies (`npm ci --include=dev`) to ensure TypeScript type packages are available.
- `frontend-tests.yml` triggers on frontend changes to provide a lighter-weight check when iterating on UI.
- `deploy-backend.yml` packages the backend and deploys to Azure Web App when credentials are provided (see below).

Review workflow status via the repository **Actions** tab. Historical failures remain visible for traceability; only the latest run reflects the current state.

## Deployment

- Backend Azure Web App deploy requires repository secrets:
  - `AZURE_WEBAPP_NAME`: Target Web App name
  - `AZURE_WEBAPP_PUBLISH_PROFILE`: Base64 publish profile
  The deploy step is skipped automatically if the publish profile secret is unset or empty.

- Frontend deployment is not automated yet. Suggested next steps:
  - Choose a static hosting target (Azure Static Web Apps, Netlify, Vercel).
  - Add a corresponding GitHub Actions workflow (e.g., build with `npm run build` and upload the `dist/` directory).

## Notes

- The backend stores data in-memory for local dev (no DB required). Set `WEBHOOK_TARGET_URL` to receive webhooks.
- See `docs/openapi.yaml` for API spec and `docs/schema.sql` for database DDL.
- Kubernetes manifests and Terraform skeletons are provided in `docs/infra/`.
