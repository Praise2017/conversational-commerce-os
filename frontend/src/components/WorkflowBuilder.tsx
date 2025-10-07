import { useState } from 'react'

type Node = { id: string; type: string; label: string }

export default function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'trigger', type: 'trigger', label: 'On Message Received' },
    { id: 'reply', type: 'action', label: 'Send Reply' },
  ])

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold">Workflow Builder</h2>
        <button className="text-xs bg-gray-100 border px-2 py-1 rounded" onClick={()=>setNodes(n=>[...n,{id:crypto.randomUUID(),type:'action',label:'New Node'}])}>Add Node</button>
      </div>
      <div className="flex-1 p-3 overflow-auto">
        <div className="grid grid-cols-2 gap-2">
          {nodes.map(n => (
            <div key={n.id} className="border rounded p-3">
              <div className="text-xs uppercase text-gray-500">{n.type}</div>
              <div className="font-medium">{n.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
