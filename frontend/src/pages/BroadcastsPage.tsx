import { useEffect, useState } from 'react';
import { createBroadcast, listBroadcasts } from '../api/client';

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateText, setTemplateText] = useState('Hello {{name}}!');
  const [name, setName] = useState('New Broadcast');
  const [scheduledAt, setScheduledAt] = useState<string>('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setBroadcasts(await listBroadcasts());
    } catch (err: any) {
      setError(err?.message || 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    setError(null);
    try {
      await createBroadcast({ name, templateText, scheduledAt: scheduledAt || null });
      setTemplateText('Hello {{name}}!');
      setName('New Broadcast');
      setScheduledAt('');
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create broadcast');
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-semibold text-lg">Compose Broadcast</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Name
            <input className="border rounded px-2 py-1 w-full" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Schedule (ISO)
            <input className="border rounded px-2 py-1 w-full" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} placeholder="2025-01-01T12:00:00Z" />
          </label>
        </div>
        <label className="text-sm font-medium block">
          Template text
          <textarea className="border rounded w-full p-2 h-28" value={templateText} onChange={e => setTemplateText(e.target.value)} />
        </label>
        <button className="bg-green-600 text-white px-4 py-2 rounded w-fit" onClick={onCreate} disabled={loading}>
          Schedule Broadcast
        </button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="bg-white border rounded p-4 flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Scheduled & Recent Broadcasts</h2>
          <button className="text-sm border px-3 py-1 rounded" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div className="text-gray-500">No broadcasts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Metrics</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map(b => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{b.name}</td>
                  <td>{b.status}</td>
                  <td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : '—'}</td>
                  <td>
                    targeted: {b.metrics?.targeted ?? 0}, sent: {b.metrics?.sent ?? 0}, failed: {b.metrics?.failed ?? 0}
                  </td>
                  <td>{b.updatedAt ? new Date(b.updatedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
