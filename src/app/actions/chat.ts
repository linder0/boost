'use server'

import { 
  getAuthenticatedClient, 
  handleSupabaseError,
  ensureFound 
} from '@/lib/supabase/server'
import { ChatMessage, ChatRole } from '@/types/database'
import { isValidUUID } from '@/lib/utils'

export async function getChatHistory(eventId: string): Promise<ChatMessage[]> {
  if (!isValidUUID(eventId)) {
    throw new Error('Invalid event ID')
  }

  const { supabase } = await getAuthenticatedClient()

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  handleSupabaseError(error, 'Failed to fetch chat history')
  return (messages ?? []) as ChatMessage[]
}

export async function saveChatMessage(
  eventId: string,
  role: ChatRole,
  content: string
): Promise<ChatMessage> {
  if (!isValidUUID(eventId)) {
    throw new Error('Invalid event ID')
  }

  const { supabase } = await getAuthenticatedClient()

  // Verify user owns the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single()

  ensureFound(event, eventError, 'Event not found or access denied')

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      event_id: eventId,
      role,
      content,
    })
    .select()
    .single()

  return ensureFound(message, error, 'Failed to save chat message') as ChatMessage
}

export async function clearChatHistory(eventId: string): Promise<void> {
  if (!isValidUUID(eventId)) {
    throw new Error('Invalid event ID')
  }

  const { supabase } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('event_id', eventId)

  handleSupabaseError(error, 'Failed to clear chat history')
}
