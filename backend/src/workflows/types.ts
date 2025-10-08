export type SendMessageParams = {
  text?: string;
  textTemplate?: string;
};

export type ConditionIntentParams = {
  intents: string[];
  fallback?: string;
};

export type AssignParams = {
  queue: string;
};

export type NodeType = 'action.send_message' | 'condition.intent' | 'action.assign';

export type NodeParamsMap = {
  'action.send_message': SendMessageParams;
  'condition.intent': ConditionIntentParams;
  'action.assign': AssignParams;
};

export type Node<Type extends NodeType = NodeType> = {
  id: string
  type: Type
  params?: NodeParamsMap[Type]
  position?: { x: number; y: number }
}

export type Edge = {
  from: string
  to: string
  label?: string // used by condition nodes
}

export type WorkflowStatus = 'draft' | 'active' | 'archived'

export type Workflow = {
  id: string
  name: string
  status: WorkflowStatus
  trigger: 'message.received'
  start: string // node id
  nodes: Node[]
  edges: Edge[]
  version: number
  createdAt: string
  updatedAt: string
}
