# Workflow JSON ↔ Node Mapping

- Node types:
  - `trigger.*` implicit start.
  - `condition.*` expose labeled output ports → edges.
  - `action.*` single `next` edge.
- Edges:
  - Condition `ports` become edges `{ from: node.id, to: ports[key], port: key }`.
- Context:
  - `ctx` includes `contact`, `message`, `workspace`, `vars`. Nodes can write `ctx.vars`.
- Versioning:
  - `version` increments on publish; immutable once active; rollback by activating previous.
- UI Meta:
  - Positions stored separately from runtime DSL.
- Validation:
  - Unique node IDs; all `next`/ports resolve; cycles only via `system.wait` with resume token.
