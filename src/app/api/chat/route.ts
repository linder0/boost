import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamChatResponse, ChatContext } from '@/lib/ai/chat-assistant'
import { Event, VendorWithThread, ChatMessage } from '@/types/database'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { eventId, message } = await request.json()

    if (!eventId || !message) {
      return NextResponse.json(
        { error: 'Missing eventId or message' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch event (RLS ensures ownership)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch vendors with threads
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*, vendor_threads(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError)
    }

    // Fetch chat history
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('Error fetching chat history:', historyError)
    }

    // Save user message
    const { error: saveUserError } = await supabase.from('chat_messages').insert({
      event_id: eventId,
      role: 'user',
      content: message,
    })

    if (saveUserError) {
      console.error('Error saving user message:', saveUserError)
    }

    // Build context
    const context: ChatContext = {
      event: event as Event,
      vendors: (vendors ?? []) as VendorWithThread[],
      chatHistory: (chatHistory ?? []) as ChatMessage[],
    }

    // Stream response
    const stream = await streamChatResponse(context, message)

    // We need to collect the response to save it
    const [streamForClient, streamForSave] = stream.tee()

    // Save assistant response in the background
    saveAssistantResponse(supabase, eventId, streamForSave)

    return new Response(streamForClient, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function saveAssistantResponse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  stream: ReadableStream<Uint8Array>
) {
  try {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullResponse += decoder.decode(value, { stream: true })
    }

    if (fullResponse) {
      await supabase.from('chat_messages').insert({
        event_id: eventId,
        role: 'assistant',
        content: fullResponse,
      })
    }
  } catch (error) {
    console.error('Error saving assistant response:', error)
  }
}
