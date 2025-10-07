const target = process.env.WEBHOOK_TARGET_URL;

export async function emitWebhook(topic: string, payload: unknown) {
  if (!target) return;
  try {
    await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ccos-topic': topic
      },
      body: JSON.stringify({ topic, payload, ts: new Date().toISOString() })
    });
  } catch (err) {
    // best-effort only in MVP
    console.error('webhook error', (err as Error).message);
  }
}
