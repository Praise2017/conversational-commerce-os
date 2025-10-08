# Security & Compliance Overview

## RBAC Model

- **Workspace Owner**
  - Full administrative control across the tenant.
  - Manages billing, invites/removes users, assigns roles.
- **Administrator**
  - Manages channels, templates, automations.
  - Can view all analytics and compliance exports.
- **Agent**
  - Handles conversations, broadcasts, and workflow runs scoped to their workspace.
- **Analyst**
  - Read-only access to analytics dashboards and audit logs.
- **Developer**
  - Manages API keys, webhooks, and sandbox integrations.
- **Compliance Officer**
  - Reviews audit trails, exports data subject reports, approves high-risk actions.

## Tenant Isolation

- Each HTTP request must include a validated workspace identifier (`X-Workspace-Id`).
- Middleware stack (`requireWorkspace`, `authRequired`) enforces tenant scoping before routing.
- Data access layers (e.g., repositories, in-memory stores) filter by `workspaceId` to avoid cross-tenant leakage.
- Background jobs and schedulers emit logs with the originating workspace to simplify investigations.
- Metrics and health checks expose per-tenant labels only when safe; avoid exporting sensitive payloads.

## Authorization Flow

1. **Identity**
   - Users authenticate via OAuth/OIDC or JWT issued by PraisePoint Identity.
   - Tokens include `sub`, `workspaceId`, `roles`, and optional `scopes` claims.
2. **Validation**
   - `authOptional` / `authRequired` middleware validates signatures and token expiry via `jsonwebtoken`.
   - Invalid or expired tokens trigger `401` with structured error metadata.
3. **Role Resolution**
   - `roles` claim maps to RBAC definitions above.
   - Derived permissions cached per request to minimize repeated lookups.
4. **Policy Enforcement**
   - Route handlers check `request.user.hasRole('admin')` or finer-grained capability checks (e.g., `canManageBroadcasts`).
   - Repository methods accept `workspaceId` to ensure data scoping; no global read access.
5. **Auditing**
   - All privileged actions log via `requestLogger()` with `workspaceId`, `userId`, `role`, and action metadata.
   - Compliance exports and security events are stored for 365 days.

## Roadmap Considerations

- Implement fine-grained scopes (e.g., `broadcast:write`, `workflow:read`) layered on top of role groups.
- Integrate with external IAM providers (Okta, Azure AD) for enterprise SSO.
- Add anomaly detection to flag cross-tenant access attempts.
- Provide customer-facing audit log APIs with pagination and export formats.
