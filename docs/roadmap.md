# Roadmap

## MVP (8–10 weeks)
- Auth/RBAC, Contacts + Inbox basic, WA/Messenger connectors, Workflow v1, AI summary+intent, Broadcasts basic, Analytics v1, Observability, GDPR, Multi-tenant scaffolding.

## M2 (6–8 weeks)
- Template approvals sync, RAG connectors (Drive/Confluence), Command Palette, Advanced routing, SLAs/queues, Segment builder, A/B testing, Billing.

## M3 (8–10 weeks)
- WeChat/Line/Email, On‑prem LLM, Custom code WASM, Advanced analytics, Marketplace SDK, SSO (SAML/SCIM).

## Phase 0 Planning Artefacts

### Competitor Analysis Snapshot
- **Twilio Flex**: Strength in API-first extensibility and enterprise telephony; gaps in AI-native workflows and SMB pricing.
- **Intercom**: Best-in-class agent UX and automation templates; limited multi-channel orchestration outside web/app.
- **MessageBird Inbox**: Strong global channel coverage (SMS, WhatsApp, LINE); lacks deep workflow builder and analytics.
- **Iterable**: Sophisticated journey orchestration and experimentation; weaker real-time agent tooling.
- **Zendesk Sunshine Conversations**: Solid integrations, but customization requires significant development effort.

Key differentiators for PraisePoint OS: conversational workflow builder with LLM templates, first-party storefront data connectors, and unified observability/compliance out of the box.

### KPI Dashboard Blueprint
- **Goal**: Provide executive and operational visibility into engagement, revenue influence, and agent productivity within 6 weeks of MVP launch.
- **Tooling Options**:
  - Metabase (self-hosted) for quick dashboards with SQL-based configuration.
  - Superset for advanced slicing/drill-down and role-based access.
  - Looker Studio (managed) if GTM needs rapid sharing without infra overhead.
- **Core Metrics**:
  - Conversation volume by channel, SLA adherence, and sentiment trends.
  - Broadcast conversion (sent → delivered → clicked → converted).
  - Workflow performance: completion rate, drop-off nodes, average resolution time.
  - Revenue attribution: assisted revenue per channel/segment.
- **Data Sources**:
  - PostgreSQL (events, workflows, broadcasts, revenue webhooks).
  - Prometheus metrics (latency, error rates) exported via push gateway.
  - Optional Snowflake/BigQuery connector for customer 360 enrichment.
- **Next Steps**:
  - Define warehouse schema contracts by end of Phase 0.
  - Automate daily ETL job into analytics store.
  - Provide role-based dashboard views (executive, ops manager, agent lead).
