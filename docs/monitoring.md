# Monitoring & Alerting

## Metrics
- API: RPS, p50/p95, error rate.
- Workflows: step duration, failures, queue lag.
- Channels: delivery success, template rejection, rate limit hits.
- Business: automation rate, CSAT, revenue per conversation.

## Tracing
- Span per workflow step; links to message IDs.

## Dashboards
- SRE: golden signals, DB saturation.
- Ops: agent load, SLA breaches, backlog.
- Marketing: broadcast funnel, CTR.

## SLOs
- Availability 99.95% (alert at 99.9%).
- P95 send latency < 500ms.
- Job failure rate < 1% (5m).
