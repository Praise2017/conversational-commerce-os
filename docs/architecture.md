# Architecture

```mermaid
flowchart LR
  subgraph Clients
    Web[Web App (React)]
    Agents[Agents]
    Admins[Admins]
    WebhooksPartners[External Integrations]
  end

  subgraph Edge
    APIGW[API Gateway/Ingress]
  end

  subgraph App[App Services]
    Auth[Auth & RBAC]
    Inbox[Unified Inbox Service]
    Contacts[Contacts/CRM Service]
    Channels[Channel Connectors]
    Workflows[Workflow Orchestrator]
    Broadcasts[Broadcast Service]
    Templates[Template Service]
    AI[AI Brain Service]
    Knowledge[Knowledge Service]
    Analytics[Analytics API]
    Webhooks[Webhook Dispatcher]
    Jobs[Job/Queue Worker]
  end

  subgraph Data[State & Infra]
    PG[(Postgres)]
    Redis[(Redis)]
    VecDB[(Vector DB: Pinecone/Milvus)]
    S3[(Object Storage)]
    Bus[(Event Bus: NATS/Kafka)]
    OTEL[(Telemetry: OTLP)]
  end

  Clients --> APIGW --> Auth
  APIGW --> Inbox
  APIGW --> Contacts
  APIGW --> Workflows
  APIGW --> Broadcasts
  APIGW --> Templates
  APIGW --> Analytics

  Inbox <-- Bus --> Workflows
  Workflows --> AI
  AI --> Knowledge
  Knowledge <--> VecDB
  Contacts --> PG
  Broadcasts --> Jobs
  Channels <--> ExternalChannels[WhatsApp/Meta/SMS/Email/WeChat/etc]
  Channels --> Bus
  Jobs --> Channels
  Webhooks --> WebhooksPartners

  AllServices[[All Services]] --> Redis
  AllServices --> S3
  AllServices --> OTEL
```

## Component Responsibilities
- Auth & RBAC: OAuth2, JWT, tenant scoping, permissions.
- Inbox: Threads, assignment, SLAs, comments, dispatch.
- Contacts: CRM fields, identities, merge, segments, timeline.
- Channels: Adapters, webhooks, template sync, rate limiting.
- Workflows: Event-driven orchestrator; versioned; custom code sandbox.
- AI Brain: Intent, summary, reply generation, safety.
- Knowledge: Connectors, ingest, embed, retrieve with filters.
- Broadcasts: Segments, scheduling, throttling, reports.
- Data: Postgres (RLS), Redis, Vector store, S3.
- Observability: OpenTelemetry traces/metrics/logs.
