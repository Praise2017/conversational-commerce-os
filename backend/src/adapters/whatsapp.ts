export type WhatsAppConfig = {
  token: string
  phoneId: string
  apiBase?: string
}

export async function sendText(cfg: WhatsAppConfig, to: string, text: string) {
  const base = cfg.apiBase || 'https://graph.facebook.com/v17.0'
  const url = `${base}/${cfg.phoneId}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    let err: any = undefined
    try { err = await res.json() } catch {}
    return { ok: false, status: res.status, error: err }
  }
  const json = await res.json()
  return { ok: true, response: json }
}
