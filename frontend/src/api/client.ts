import { useAuthStore } from '../state/auth'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID || 'demo-ws';

export async function api(path: string, init: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-workspace-id': WORKSPACE_ID,
      ...(token ? { 'authorization': `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function getToken(input: { client_id: string; client_secret: string; workspace_id: string }) {
  return api('/v1/auth/token', { method: 'POST', body: JSON.stringify(input) })
}

export async function listContacts() {
  const json = await api('/v1/contacts');
  return json.data as Array<any>;
}

export async function createContact(input: { displayName: string; email?: string; phone?: string; }) {
  return api('/v1/contacts', { method: 'POST', body: JSON.stringify(input) });
}

export async function listMessages(contactId: string) {
  const json = await api(`/v1/messages?contactId=${encodeURIComponent(contactId)}`);
  return json.data as Array<any>;
}

export async function sendMessage(contactId: string, text: string) {
  return api('/v1/messages', { method: 'POST', body: JSON.stringify({ contactId, type: 'text', text }) });
}

export async function listBroadcasts() {
  const json = await api('/v1/broadcasts');
  return json.data as Array<any>;
}

export async function createBroadcast(input: { name: string; templateText: string; scheduledAt?: string | null; segmentId?: string | null }) {
  return api('/v1/broadcasts', { method: 'POST', body: JSON.stringify(input) });
}

export async function listChannels() {
  const json = await api('/v1/channels');
  return json.data as Array<any>;
}

export async function createChannel(input: { type: string; name: string; config?: Record<string, unknown> }) {
  return api('/v1/channels', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateChannelStatus(id: string, status: 'inactive' | 'active' | 'error') {
  return api(`/v1/channels/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function getAnalyticsSummary() {
  return api('/v1/analytics/summary');
}
