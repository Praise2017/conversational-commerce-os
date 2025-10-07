# Acceptance Criteria & KPI Dashboard

## Acceptance Criteria
- Multi-tenant isolation by `workspace_id` across APIs, DB, logs
- Inbox: assignment, notes, snooze, AI summary, sentiment priority
- Workflow builder: publish/rollback versions; execute on inbound
- Channels: WhatsApp + 1 more connected; send/receive verified
- Broadcasts: schedule, throttle, delivery metrics
- GDPR: export/delete operational with audit logs
- Dashboards: core KPIs visible for Ops and Execs

## KPIs
- CSAT (1–5): average, trend (7/30d), by agent
- Throughput: messages/min; handled vs automated
- MTTR: mean time to resolution per queue
- Automation rate: % messages handled by automation
- Revenue per conversation: attributed via webhooks/UTMs
- Agent KPIs: handled/hour, FCR, backlog

## Example Metrics Schema (Prometheus names)
- `api_request_duration_seconds` (histogram, labels: route, method, status)
- `workflow_step_duration_seconds` (histogram, labels: node_type)
- `channel_delivery_success_total` (counter, labels: channel)
- `automation_handled_total` (counter)
- `convo_revenue_usd` (counter, labels: workspace, thread_key)

## Example SQL (7d revenue per convo)
```sql
SELECT thread_key, SUM(value) AS revenue
FROM events
WHERE workspace_id = $1 AND type = 'revenue_attribution' AND ts > now() - interval '7 days'
GROUP BY thread_key ORDER BY revenue DESC;
```

## Dashboard Layouts
- Exec: CSAT, revenue/convo, automation rate, uptime
- Ops: SLA compliance, backlog, P95 send latency, job failures
- Agents: personal CSAT, handled/hour, average handle time
