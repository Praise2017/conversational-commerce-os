# Testing Plan

## Unit
- Validators, services, workflow node runners (Vitest/Jest).

## Integration
- API with supertest; DB with Testcontainers; seed fixtures per workspace.

## E2E
- Playwright: connect channel mock → receive message → workflow → inbox.

## Load
- k6 scenarios: message bursts (p95 < 500ms), 100k concurrent conversations.

## Security
- OWASP ZAP; dependency audits; secrets scans; RBAC tests; data export/delete tests.

### Example k6
```js
import http from 'k6/http'; import { sleep } from 'k6';
export const options = { vus: 200, duration: '5m' };
export default function () {
  const headers = { 'x-workspace-id': 'load-ws', 'content-type': 'application/json' };
  http.get('http://localhost:4000/v1/contacts', { headers });
  sleep(1);
}
```
