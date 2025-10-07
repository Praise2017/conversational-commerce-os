import { useEffect, useState } from 'react';
import { createChannel, listChannels, updateChannelStatus } from '../api/client';

const CHANNEL_TYPES = ['whatsapp', 'messenger', 'sms', 'email'];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('New Channel');
  const [type, setType] = useState(CHANNEL_TYPES[0]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setChannels(await listChannels());
    } catch (err: any) {
      setError(err?.message || 'Failed to load channels');
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
      await createChannel({ name, type, config: {} });
      setName('New Channel');
      setType(CHANNEL_TYPES[0]);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create channel');
    }
  }

  async function updateStatus(channelId: string, status: 'inactive' | 'active' | 'error') {
    setError(null);
    try {
      await updateChannelStatus(channelId, status);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-semibold text-lg">Add Channel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Name
            <input className="border rounded px-2 py-1 w-full" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Type
            <select className="border rounded px-2 py-1 w-full" value={type} onChange={e => setType(e.target.value)}>
              {CHANNEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-fit" onClick={onCreate} disabled={loading}>Create Channel</button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="bg-white border rounded p-4 flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Channels</h2>
          <button className="text-sm border px-3 py-1 rounded" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : channels.length === 0 ? (
          <div className="text-gray-500">No channels yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{ch.name}</td>
                  <td>{ch.type}</td>
                  <td>{ch.status}</td>
                  <td>{ch.updatedAt ? new Date(ch.updatedAt).toLocaleString() : '—'}</td>
                  <td className="space-x-2">
                    {['inactive','active','error'].map(status => (
                      <button
                        key={status}
                        className={`text-xs px-2 py-1 border rounded ${ch.status === status ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                        onClick={() => updateStatus(ch.id, status as any)}
                      >
                        {status}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
