import { query } from '../db/pg.js';
import type { Workflow, WorkflowStatus, Node, Edge, NodeType, NodeParamsMap } from '../workflows/types.js';

type WorkflowRow = {
  id: string;
  name: string;
  status: WorkflowStatus;
  version: number;
  dsl: unknown;
  created_at: string;
  updated_at?: string;
};

type DSLPayload = {
  trigger?: 'message.received';
  start?: string;
  nodes?: unknown;
  edges?: unknown;
};

function isNodeType(value: string): value is NodeType {
  return value === 'action.send_message' || value === 'condition.intent' || value === 'action.assign';
}

function parseNodes(value: unknown): Node[] {
  if (!Array.isArray(value)) return [];
  const result: Node[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const nodeObj = raw as Record<string, unknown>;
    const id = typeof nodeObj.id === 'string' ? nodeObj.id : undefined;
    const typeValue = nodeObj.type;
    if (!id || typeof typeValue !== 'string' || !isNodeType(typeValue)) continue;
    const base: Node = { id, type: typeValue };
    if (typeof nodeObj.position === 'object' && nodeObj.position !== null) {
      const pos = nodeObj.position as Record<string, unknown>;
      const x = typeof pos.x === 'number' ? pos.x : undefined;
      const y = typeof pos.y === 'number' ? pos.y : undefined;
      if (typeof x === 'number' && typeof y === 'number') {
        base.position = { x, y };
      }
    }
    if (nodeObj.params && typeof nodeObj.params === 'object') {
      const paramsMap = nodeObj.params as Record<string, unknown>;
      const params = mapParamsForType(typeValue, paramsMap);
      if (params) {
        base.params = params;
      }
    }
    result.push(base);
  }
  return result;
}

function mapParamsForType<Type extends NodeType>(type: Type, params: Record<string, unknown>): NodeParamsMap[Type] | undefined {
  switch (type) {
    case 'action.send_message': {
      const text = typeof params.text === 'string' ? params.text : undefined;
      const textTemplate = typeof params.textTemplate === 'string' ? params.textTemplate : undefined;
      return { text, textTemplate } as NodeParamsMap[Type];
    }
    case 'condition.intent': {
      const intentsValue = params.intents;
      const intents = Array.isArray(intentsValue) ? intentsValue.filter((i): i is string => typeof i === 'string') : undefined;
      const fallback = typeof params.fallback === 'string' ? params.fallback : undefined;
      if (intents && intents.length > 0) {
        return { intents, fallback } as NodeParamsMap[Type];
      }
      return undefined;
    }
    case 'action.assign': {
      const queue = typeof params.queue === 'string' ? params.queue : undefined;
      if (queue) {
        return { queue } as NodeParamsMap[Type];
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function parseEdges(value: unknown): Edge[] {
  if (!Array.isArray(value)) return [];
  const result: Edge[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const edgeObj = raw as Record<string, unknown>;
    const from = typeof edgeObj.from === 'string' ? edgeObj.from : undefined;
    const to = typeof edgeObj.to === 'string' ? edgeObj.to : undefined;
    if (!from || !to) continue;
    const edge: Edge = { from, to };
    if (typeof edgeObj.label === 'string') {
      edge.label = edgeObj.label;
    }
    result.push(edge);
  }
  return result;
}

function parseDsl(dsl: unknown): DSLPayload {
  if (!dsl) return {};
  if (typeof dsl === 'string') {
    try {
      const parsed = JSON.parse(dsl) as DSLPayload;
      return parsed;
    } catch {
      return {};
    }
  }
  if (typeof dsl === 'object') {
    return dsl as DSLPayload;
  }
  return {};
}

function mapRow(rowData: WorkflowRow): Workflow {
  const dsl = parseDsl(rowData.dsl);
  return {
    id: rowData.id,
    name: rowData.name,
    status: rowData.status,
    version: rowData.version,
    trigger: dsl.trigger ?? 'message.received',
    start: dsl.start ?? '',
    nodes: parseNodes(dsl.nodes),
    edges: parseEdges(dsl.edges),
    createdAt: rowData.created_at,
    updatedAt: rowData.updated_at ?? rowData.created_at,
  };
}

export async function list(wsId: string): Promise<Workflow[]> {
  const res = await query<WorkflowRow>(
    `SELECT id, name, version, status, dsl, created_at, updated_at
       FROM workflows
      WHERE workspace_id=$1
      ORDER BY created_at DESC`,
    [wsId]
  );
  if (!res) return [];
  return res.rows.map(mapRow);
}

export async function listByTrigger(wsId: string, trigger: 'message.received'): Promise<Workflow[]> {
  const res = await query<WorkflowRow>(
    `SELECT id, name, version, status, dsl, created_at, updated_at
       FROM workflows
      WHERE workspace_id=$1 AND status='active'`,
    [wsId]
  );
  if (!res) return [];
  return res.rows
    .map(mapRow)
    .filter(wf => wf.trigger === trigger);
}

export async function find(wsId: string, id: string): Promise<Workflow | null> {
  const res = await query<WorkflowRow>(
    `SELECT id, name, version, status, dsl, created_at, updated_at
       FROM workflows
      WHERE workspace_id=$1 AND id=$2
      LIMIT 1`,
    [wsId, id]
  );
  if (!res || res.rows.length === 0) return null;
  return mapRow(res.rows[0]);
}

export async function create(wsId: string, input: {
  name: string;
  status?: WorkflowStatus;
  trigger: 'message.received';
  start: string;
  nodes: Node[];
  edges: Edge[];
}): Promise<Workflow | null> {
  const res = await query<WorkflowRow>(
    `INSERT INTO workflows (workspace_id, name, status, dsl)
     VALUES ($1, $2, COALESCE($3, 'draft'), jsonb_build_object(
        'trigger', $4,
        'start', $5,
        'nodes', $6::jsonb,
        'edges', $7::jsonb
      ))
     RETURNING id, name, version, status, dsl, created_at, updated_at`,
    [wsId, input.name, input.status ?? null, input.trigger, input.start, JSON.stringify(input.nodes), JSON.stringify(input.edges)]
  );
  if (!res || res.rows.length === 0) return null;
  return mapRow(res.rows[0]);
}

export async function update(wsId: string, id: string, input: {
  name?: string;
  status?: WorkflowStatus;
  trigger?: 'message.received';
  start?: string;
  nodes?: Node[];
  edges?: Edge[];
}): Promise<Workflow | null> {
  const existing = await find(wsId, id);
  if (!existing) return null;

  const trigger = input.trigger ?? existing.trigger;
  const start = input.start ?? existing.start;
  const nodes = input.nodes ?? existing.nodes;
  const edges = input.edges ?? existing.edges;

  const res = await query<WorkflowRow>(
    `UPDATE workflows
        SET name = COALESCE($3, name),
            status = COALESCE($4, status),
            version = version + 1,
            dsl = jsonb_build_object('trigger',$5,'start',$6,'nodes',$7::jsonb,'edges',$8::jsonb),
            updated_at = now()
      WHERE workspace_id=$1 AND id=$2
      RETURNING id, name, version, status, dsl, created_at, updated_at`,
    [wsId, id, input.name ?? null, input.status ?? null, trigger, start, JSON.stringify(nodes), JSON.stringify(edges)]
  );
  if (!res || res.rows.length === 0) return null;
  return mapRow(res.rows[0]);
}

export async function remove(wsId: string, id: string): Promise<boolean> {
  const res = await query<{ exists: true }>(
    `DELETE FROM workflows
      WHERE workspace_id=$1 AND id=$2
      RETURNING true as exists`,
    [wsId, id]
  );
  if (!res) return false;
  return res.rows.length > 0;
}
