import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'event-ops-automation',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
