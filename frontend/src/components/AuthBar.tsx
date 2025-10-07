import { useState } from 'react'
import { useAuthStore } from '../state/auth'
import { getToken } from '../api/client'

export default function AuthBar() {
  const { token, setToken } = useAuthStore()
  const [clientId, setClientId] = useState('demo-client')
  const [clientSecret, setClientSecret] = useState('demo-secret')
  const [ws, setWs] = useState(import.meta.env.VITE_WORKSPACE_ID || 'demo-ws')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function signIn() {
    setErr(null); setLoading(true)
    try {
      const res = await getToken({ client_id: clientId, client_secret: clientSecret, workspace_id: ws })
      setToken(res.access_token)
    } catch (e: any) {
      setErr(e?.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  function signOut() { setToken(null) }

  return (
    <div className="w-full flex items-center justify-between px-3 py-2 bg-white border rounded mb-2">
      <div className="text-sm font-medium">Auth</div>
      <div className="flex items-center gap-2">
        {token ? (
          <>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Signed In</span>
            <button className="text-xs px-2 py-1 border rounded" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <>
            <input className="border rounded px-2 py-1 text-sm" placeholder="client_id" value={clientId} onChange={e=>setClientId(e.target.value)} />
            <input className="border rounded px-2 py-1 text-sm" placeholder="client_secret" value={clientSecret} onChange={e=>setClientSecret(e.target.value)} />
            <input className="border rounded px-2 py-1 text-sm" placeholder="workspace_id" value={ws} onChange={e=>setWs(e.target.value)} />
            <button className="text-xs px-2 py-1 border rounded bg-blue-600 text-white" onClick={signIn} disabled={loading}>{loading?'...':'Sign in'}</button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </>
        )}
      </div>
    </div>
  )
}
