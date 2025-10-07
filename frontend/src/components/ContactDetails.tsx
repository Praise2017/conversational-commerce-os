import { useEffect, useState } from 'react'
import { listMessages, sendMessage } from '../api/client'

export default function ContactDetails({ contact }: { contact: any | null }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    async function fetchMsgs() {
      if (!contact) { setMessages([]); return }
      setLoading(true)
      setError(null)
      try {
        setMessages(await listMessages(contact.id))
      } catch (err: any) {
        setError(err?.message || 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }
    fetchMsgs()
  }, [contact?.id])

  async function onSend() {
    if (!contact || !text.trim()) return
    setError(null)
    try {
      await sendMessage(contact.id, text.trim())
      setText('')
      setMessages(await listMessages(contact.id))
    } catch (err: any) {
      setError(err?.message || 'Failed to send message')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b"><h2 className="font-semibold">Contact Details</h2></div>
      {!contact ? (
        <div className="p-3 text-gray-500">Select a contact</div>
      ) : (
        <>
          {error && <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border-b">{error}</div>}
          <div className="p-3 border-b grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-500 text-sm">Name</div>
              <div className="font-medium">{contact.displayName}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Email</div>
              <div className="font-medium">{contact.email || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Phone</div>
              <div className="font-medium">{contact.phone || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Created</div>
              <div className="font-medium">{new Date(contact.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {loading ? <div className="text-gray-500">Loading…</div> : (
              messages.length === 0 ? <div className="text-gray-500">No messages yet</div> : (
                <ul className="space-y-1">
                  {messages.map(m => (
                    <li key={m.id} className={"max-w-[80%] p-2 rounded "+(m.direction==='outbound'?'bg-blue-50 ml-auto text-right':'bg-gray-100')}>
                      {m.text || <span className="italic text-gray-500">{m.mtype}</span>}
                      <div className="text-[10px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input className="border rounded px-2 py-1 flex-1" placeholder="Type a message" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') onSend() }} disabled={loading} />
            <button className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50" onClick={onSend} disabled={loading || !text.trim()}>Send</button>
          </div>
        </>
      )}
    </div>
  )
}
