import { gmail_v1 } from 'googleapis';
import { getGmailClient } from './supabase-auth';

export async function sendEmail(
  userId: string,
  params: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  }
) {
  const gmail = await getGmailClient(userId);

  const message = [
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    '',
    params.body,
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: gmail_v1.Schema$Message = {
    raw: encodedMessage,
  };

  if (params.threadId) {
    requestBody.threadId = params.threadId;
  }

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody,
  });

  return response.data;
}

export async function listMessages(
  userId: string,
  query: string,
  maxResults: number = 10
) {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  return response.data.messages || [];
}

export async function getMessage(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return response.data;
}

export async function extractEmailThread(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);

  const message = await getMessage(userId, messageId);
  const threadId = message.threadId;

  if (!threadId) {
    return [message];
  }

  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
  });

  return thread.data.messages || [];
}

export function decodeEmailBody(message: gmail_v1.Schema$Message): string {
  let body = '';

  if (message.payload) {
    const parts = message.payload.parts || [message.payload];

    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
        body += decoded;
      } else if (part.body?.data && !part.parts) {
        // Handle single part messages
        const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
        body += decoded;
      }
    }
  }

  return body.trim();
}

export function getEmailHeader(
  message: gmail_v1.Schema$Message,
  headerName: string
): string | undefined {
  const header = message.payload?.headers?.find(
    (h) => h.name?.toLowerCase() === headerName.toLowerCase()
  );
  return header?.value || undefined;
}

export async function markAsRead(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}
