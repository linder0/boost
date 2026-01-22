// Inngest event schemas
export const eventSchemas = {
  'vendor.outreach.start': {
    data: {
      vendorId: 'string',
      userId: 'string',
    },
  },
  'inbox.poll.triggered': {
    data: {
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
  'decision.made': {
    data: {
      decisionId: 'string',
      threadId: 'string',
      vendorId: 'string',
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
  'message.human.send': {
    data: {
      threadId: 'string',
      userId: 'string',
      message: 'string',
    },
  },
};

export type EventSchemas = typeof eventSchemas;
