import type { Workflow } from './types.js'
import { addMessage, type Contact, type Message } from '../storage/db.js'
import { getPool } from '../db/pg.js'
import * as msgRepo from '../repositories/messagesRepo.js'
import * as wfRepo from '../repositories/workflowsRepo.js'

const workflowStore: Record<string, Workflow[]> = {}

function ensureDefaultWorkflow(ws: string) {
  if (!workflowStore[ws]) {
    const now = new Date().toISOString()
    const wf: Workflow = {
      id: 'wf-echo',
      name: 'Auto Reply Echo',
      status: 'active',
      trigger: 'message.received',
      version: 1,
      createdAt: now,
      updatedAt: now,
      start: 'n1',
      nodes: [
        { id: 'n1', type: 'action.send_message', params: { textTemplate: 'Thanks {{contactName}}: {{messageText}}' } }
      ],
      edges: []
    }
    workflowStore[ws] = [wf]
  }
}

function renderTemplate(tpl: string, ctx: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => ctx[k] ?? '')
}

function nextNodeId(wf: Workflow, currentId: string, label?: string): string | null {
  const edge = wf.edges.find(e => e.from === currentId && (!label || e.label === label)) || wf.edges.find(e => e.from === currentId)
  return edge ? edge.to : null
}

function classifyIntent(text?: string): string | null {
  if (!text) return null
  const low = text.toLowerCase()
  if (/(hi|hello|hey)/.test(low)) return 'greeting'
  if (/(help|support|issue)/.test(low)) return 'support'
  return 'other'
}

type InboundContext = {
  workspaceId: string
  contact: Contact
  message: Message
}

export async function runWorkflowsForInbound(params: InboundContext) {
  const { workspaceId, contact, message } = params
  const pool = getPool()
  let wfs: Workflow[] = []
  if (pool) {
    try {
      wfs = await wfRepo.listByTrigger(workspaceId, 'message.received')
    } catch {
      wfs = []
    }
  } else {
    ensureDefaultWorkflow(workspaceId)
    wfs = workflowStore[workspaceId].filter(w => w.trigger === 'message.received')
  }
  for (const wf of wfs) {
    let nodeId: string | null = wf.start
    while (nodeId) {
      const node = wf.nodes.find(n => n.id === nodeId)
      if (!node) break
      switch (node.type) {
        case 'condition.intent': {
          const intent = classifyIntent(message.text)
          nodeId = nextNodeId(wf, node.id, intent || undefined)
          break
        }
        case 'action.send_message': {
          const sendParams = node.params ?? {}
          const template = 'textTemplate' in sendParams && typeof sendParams.textTemplate === 'string' ? sendParams.textTemplate : ''
          const text = renderTemplate(template, {
            contactName: contact.displayName || 'there',
            messageText: message.text || ''
          })
          if (pool) {
            await msgRepo.addMessage(workspaceId, { contactId: contact.id, direction: 'outbound', mtype: 'text', text })
          } else {
            addMessage(workspaceId, { contactId: contact.id, direction: 'outbound', mtype: 'text', text })
          }
          nodeId = nextNodeId(wf, node.id) // proceed to next if any
          break
        }
        default:
          nodeId = null
      }
    }
  }
}
