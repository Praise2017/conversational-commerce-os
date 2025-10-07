import { useState } from 'react'

export default function BroadcastComposer() {
  const [text, setText] = useState('Hello {{name}}!')
  const [segment, setSegment] = useState('all')

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b"><h2 className="font-semibold">Broadcast Composer</h2></div>
      <div className="p-3 space-y-2">
        <select className="border rounded px-2 py-1" value={segment} onChange={e=>setSegment(e.target.value)}>
          <option value="all">All Contacts</option>
          <option value="recent">Recent 7 days</option>
        </select>
        <textarea className="border rounded w-full p-2 h-24" value={text} onChange={e=>setText(e.target.value)} />
        <button className="bg-green-600 text-white px-3 py-1 rounded w-fit">Schedule</button>
      </div>
    </div>
  )
}
