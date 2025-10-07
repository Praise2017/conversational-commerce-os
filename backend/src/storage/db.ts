import { randomUUID } from 'node:crypto';

export type Contact = {
  id: string;
  displayName: string;
  phone?: string;
  email?: string;
  fields?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  mtype: 'text' | 'image' | 'template';
  text?: string;
  mediaUrl?: string;
  templateId?: string;
  channelId?: string;
  createdAt: string;
};

export type Channel = {
  id: string;
  type: string; // whatsapp, sms, etc
  name: string;
  status: 'inactive' | 'active' | 'error';
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type Broadcast = {
  id: string;
  name: string;
  templateText: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: { targeted: number; sent: number; failed: number };
};

export type Template = {
  id: string;
  name: string;
  body: string;
  channelType?: string;
  variables?: string[];
  createdAt: string;
  updatedAt: string;
};

type WorkspaceStore = {
  contacts: Contact[];
  messages: Message[];
  externalMap: Record<string, string>; // externalId -> contactId
  channels: Channel[];
  broadcasts: Broadcast[];
  templates: Template[];
};

const store: Record<string, WorkspaceStore> = {};

function getWorkspace(wsId: string): WorkspaceStore {
  if (!store[wsId]) store[wsId] = { contacts: [], messages: [], externalMap: {}, channels: [], broadcasts: [], templates: [] };
  return store[wsId];
}

export function addContact(wsId: string, input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Contact {
  const now = new Date().toISOString();
  const contact: Contact = {
    id: input.id ?? randomUUID(),
    displayName: input.displayName,
    phone: input.phone,
    email: input.email,
    fields: input.fields ?? {},
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now
  };
  getWorkspace(wsId).contacts.push(contact);
  return contact;
}

export function listContacts(wsId: string): Contact[] {
  return getWorkspace(wsId).contacts;
}

export function findContact(wsId: string, id: string): Contact | undefined {
  return getWorkspace(wsId).contacts.find(c => c.id === id);
}

export function getOrCreateContactByExternal(wsId: string, externalId: string): Contact {
  const ws = getWorkspace(wsId);
  const existingId = ws.externalMap[externalId];
  if (existingId) {
    const c = ws.contacts.find(x => x.id === existingId);
    if (c) return c;
  }
  const created = addContact(wsId, { displayName: `Guest ${externalId.slice(0, 6)}`, fields: { externalId } });
  ws.externalMap[externalId] = created.id;
  return created;
}

export function addMessage(wsId: string, input: Omit<Message, 'id' | 'createdAt'>): Message {
  const now = new Date().toISOString();
  const msg: Message = { id: randomUUID(), createdAt: now, ...input };
  getWorkspace(wsId).messages.push(msg);
  return msg;
}

export function listMessagesByContact(wsId: string, contactId: string): Message[] {
  return getWorkspace(wsId).messages
    .filter(m => m.contactId === contactId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Channels
export function addChannel(wsId: string, input: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>): Channel {
  const now = new Date().toISOString();
  const ch: Channel = { id: randomUUID(), createdAt: now, updatedAt: now, ...input };
  getWorkspace(wsId).channels.push(ch);
  return ch;
}

export function listChannels(wsId: string): Channel[] {
  return getWorkspace(wsId).channels;
}

export function setChannelStatus(wsId: string, id: string, status: Channel['status']) {
  const ws = getWorkspace(wsId);
  const ch = ws.channels.find(c => c.id === id);
  if (ch) ch.status = status;
  return ch;
}

export function findChannel(wsId: string, id: string): Channel | undefined {
  const ws = getWorkspace(wsId);
  return ws.channels.find(c => c.id === id);
}

// Broadcasts
export function addBroadcast(wsId: string, input: { name: string; templateText: string; scheduledAt?: string | null }): Broadcast {
  const now = new Date().toISOString();
  const b: Broadcast = {
    id: randomUUID(),
    name: input.name,
    templateText: input.templateText,
    status: input.scheduledAt ? 'scheduled' : 'running',
    scheduledAt: input.scheduledAt ?? null,
    createdAt: now,
    updatedAt: now,
    metrics: { targeted: 0, sent: 0, failed: 0 }
  };
  getWorkspace(wsId).broadcasts.push(b);
  return b;
}

export function listBroadcasts(wsId: string): Broadcast[] {
  return getWorkspace(wsId).broadcasts
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function runBroadcastNow(wsId: string, b: Broadcast) {
  const ws = getWorkspace(wsId);
  const targets = ws.contacts;
  b.metrics.targeted = targets.length;
  for (const c of targets) {
    try {
      addMessage(wsId, { contactId: c.id, direction: 'outbound', mtype: 'text', text: b.templateText });
      b.metrics.sent++;
    } catch {
      b.metrics.failed++;
    }
  }
  b.status = 'completed';
  b.updatedAt = new Date().toISOString();
}

// Templates
export function addTemplate(wsId: string, input: { name: string; body: string; channelType?: string; variables?: string[] }): Template {
  const now = new Date().toISOString();
  const t: Template = {
    id: randomUUID(),
    name: input.name,
    body: input.body,
    channelType: input.channelType,
    variables: input.variables ?? [],
    createdAt: now,
    updatedAt: now,
  };
  getWorkspace(wsId).templates.push(t);
  return t;
}

export function listTemplates(wsId: string): Template[] {
  return getWorkspace(wsId).templates.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function findTemplate(wsId: string, id: string): Template | undefined {
  return getWorkspace(wsId).templates.find(t => t.id === id);
}

// GDPR helpers
export function exportContactBundle(wsId: string, contactId: string) {
  const ws = getWorkspace(wsId);
  const contact = ws.contacts.find(c => c.id === contactId) || null;
  const messages = ws.messages.filter(m => m.contactId === contactId);
  return { contact, messages };
}

export function deleteContactBundle(wsId: string, contactId: string) {
  const ws = getWorkspace(wsId);
  ws.contacts = ws.contacts.filter(c => c.id !== contactId);
  ws.messages = ws.messages.filter(m => m.contactId !== contactId);
  for (const [ext, id] of Object.entries(ws.externalMap)) {
    if (id === contactId) delete ws.externalMap[ext];
  }
}

// Analytics summary
export function getSummaryCounts(wsId: string) {
  const ws = getWorkspace(wsId);
  const contacts = ws.contacts.length;
  const messages = ws.messages.length;
  const inbound = ws.messages.filter(m => m.direction === 'inbound').length;
  const outbound = messages - inbound;
  return { contacts, messages, inbound, outbound };
}

export function listWorkspaceIds(): string[] {
  return Object.keys(store);
}
