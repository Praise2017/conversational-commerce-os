import { useEffect, useMemo, useState } from 'react'

export type Command = { label: string; hint?: string; action: () => void }

export default function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: ()=>void; commands: Command[] }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.trim().toLowerCase()
    return commands.filter(cmd => cmd.label.toLowerCase().includes(q) || cmd.hint?.toLowerCase().includes(q))
  }, [commands, query])

  function select(command: Command) {
    command.action()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/20 flex items-start justify-center p-10" onClick={onClose}>
      <div className="bg-white border rounded w-full max-w-xl p-3 shadow-xl" onClick={e=>e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Type a command..."
          className="w-full border rounded px-2 py-1"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered[0]) {
              e.preventDefault()
              select(filtered[0])
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
        />
        <div className="mt-3 max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-500">No commands found.</div>
          ) : (
            <ul className="space-y-1">
              {filtered.map(cmd => (
                <li key={cmd.label}>
                  <button
                    className="w-full text-left px-2 py-1 rounded hover:bg-blue-50"
                    onClick={() => select(cmd)}
                  >
                    <div className="font-medium">{cmd.label}</div>
                    {cmd.hint && <div className="text-xs text-gray-500">{cmd.hint}</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
