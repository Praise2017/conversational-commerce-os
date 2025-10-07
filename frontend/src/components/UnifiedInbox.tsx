import { useEffect, useState } from 'react'
import { listContacts, createContact } from '../api/client'

export default function UnifiedInbox({ onSelect }: { onSelect: (c:any)=>void }) {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setContacts(await listContacts())
    } catch (err: any) {
      setError(err?.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function add() {
    if (!name) return
    setError(null)
    try {
      await createContact({ displayName: name, email: email || undefined })
      setName(''); setEmail('');
      await refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to create contact')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b"><h2 className="font-semibold">Unified Inbox</h2></div>
      {error && <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border-b">{error}</div>}
      <div className="p-3 flex gap-2 border-b">
        <input className="border rounded px-2 py-1 flex-1" placeholder="Display name" value={name} onChange={e=>setName(e.target.value)} disabled={loading} />
        <input className="border rounded px-2 py-1 flex-1" placeholder="Email (optional)" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} />
        <button className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50" onClick={add} disabled={loading || !name}>Add</button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? <div className="p-3 text-gray-500">Loading...</div> : (
          <ul>
            {contacts.map(c => (
              <li key={c.id} className="px-3 py-2 border-b hover:bg-gray-50 cursor-pointer" onClick={()=>onSelect(c)}>
                <div className="font-medium">{c.displayName}</div>
                <div className="text-xs text-gray-500">{c.email || c.phone || '—'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
