# PraisePoint E Commerce

An enterprise-grade, multi-tenant platform unifying omnichannel messaging, intelligent automation, and AI conversation intelligence.

## Quickstart

- Backend (Node 18+):
  1) Set env: copy `backend/.env.example` to `.env`
  2) Install deps: `npm i` in `backend/`
  3) Run: `npm run dev`
  4) Test endpoint:
     - `POST http://localhost:4000/v1/contacts` with header `x-workspace-id: demo-ws`
     - Body: `{ "displayName": "Jane Doe", "email": "jane@example.com" }`

- Frontend:
  1) Install deps: `npm i` in `frontend/`
  2) Run: `npm run dev`
  3) Open: http://localhost:5173

## Project Structure

- backend/ — TypeScript Express API (multi-tenant via `x-workspace-id` header)
- frontend/ — React + Tailwind starter UI (Inbox, Contacts, Workflows, Broadcasts)
- docs/ — PRD, OpenAPI, Schema, DSL, Architecture

## Notes
- The backend stores data in-memory for local dev (no DB required). Set `WEBHOOK_TARGET_URL` to receive webhooks.
- See `docs/openapi.yaml` for API spec and `docs/schema.sql` for database DDL.
- Kubernetes manifests and Terraform skeletons are provided in `docs/infra/`.
