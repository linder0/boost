import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'event-ops-automation',
  // In dev mode, Inngest SDK auto-connects to local dev server
  // For production, set INNGEST_EVENT_KEY env var
  eventKey: process.env.NODE_ENV === 'development' ? 'test' : process.env.INNGEST_EVENT_KEY,
});
