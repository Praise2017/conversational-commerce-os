import { useState } from 'react';
import UnifiedInbox from '../components/UnifiedInbox';
import ContactDetails from '../components/ContactDetails';
import WorkflowBuilder from '../components/WorkflowBuilder';
import BroadcastComposer from '../components/BroadcastComposer';

export default function InboxPage() {
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  return (
    <div className="grid grid-cols-12 gap-2 h-full">
      <div className="col-span-4 border rounded bg-white min-h-0">
        <UnifiedInbox onSelect={setSelectedContact} />
      </div>
      <div className="col-span-4 border rounded bg-white min-h-0">
        <ContactDetails contact={selectedContact} />
      </div>
      <div className="col-span-4 grid grid-rows-2 gap-2">
        <div className="border rounded bg-white overflow-hidden">
          <WorkflowBuilder />
        </div>
        <div className="border rounded bg-white overflow-hidden">
          <BroadcastComposer />
        </div>
      </div>
    </div>
  );
}
