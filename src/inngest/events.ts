// Inngest event schemas
//
// Each key maps to an Inngest event name.
// Events without a handler are noted so they can be implemented or removed.
export const eventSchemas = {
  'vendor.outreach.start': {
    data: {
      vendorId: 'string',
      userId: 'string',
    },
  },
  'message.inbound.new': {
    data: {
      messageId: 'string',
      threadId: 'string',
      userId: 'string',
    },
  },
  'message.parsed': {
    data: {
      parsedResponseId: 'string',
      messageId: 'string',
      threadId: 'string',
      userId: 'string',
    },
  },
  'followup.scheduled': {
    data: {
      threadId: 'string',
      vendorId: 'string',
      userId: 'string',
      attempt: 'number',
    },
  },
  // TODO: add handler or remove — currently sent from escalateThread() but has no handler
  'message.human.send': {
    data: {
      threadId: 'string',
      userId: 'string',
      message: 'string',
    },
  },
  // TODO: add handler or remove — currently sent from make-decision but has no handler
  'vendor.escalation': {
    data: {
      threadId: 'string',
      vendorId: 'string',
      userId: 'string',
      reason: 'string',
    },
  },
};
