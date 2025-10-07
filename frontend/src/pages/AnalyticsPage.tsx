import { useEffect, useState } from 'react';
import { getAnalyticsSummary } from '../api/client';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<{ contacts: number; messages: number; inbound: number; outbound: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-white border rounded p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Workspace Summary</h2>
          <p className="text-sm text-gray-500">Snapshot of contacts and message volume.</p>
        </div>
        <button className="text-sm border px-3 py-1 rounded" onClick={refresh} disabled={loading}>Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <MetricCard title="Contacts" value={summary?.contacts ?? 0} loading={loading} />
        <MetricCard title="Messages" value={summary?.messages ?? 0} loading={loading} />
        <MetricCard title="Inbound" value={summary?.inbound ?? 0} loading={loading} />
        <MetricCard title="Outbound" value={summary?.outbound ?? 0} loading={loading} />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}

function MetricCard({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-2">{loading ? '…' : value}</div>
    </div>
  );
}
