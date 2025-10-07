export type NodeType = 'action.send_message' | 'condition.intent'

export type Node = {
  id: string
  type: NodeType
  params?: Record<string, any>
}

export type Edge = {
  from: string
  to: string
  label?: string // used by condition nodes
}

export type Workflow = {
  id: string
  name: string
  trigger: 'message.received'
  start: string // node id
  nodes: Node[]
  edges: Edge[]
  version?: number
}
