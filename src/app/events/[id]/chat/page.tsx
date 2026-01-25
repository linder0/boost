import { getChatHistory } from '@/app/actions/chat'
import { ChatInterface } from '@/components/chat-interface'
import { notFound } from 'next/navigation'
import { isValidUUID } from '@/lib/utils'

interface ChatPageProps {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params

  if (!isValidUUID(id)) {
    notFound()
  }

  let chatHistory
  try {
    chatHistory = await getChatHistory(id)
  } catch {
    notFound()
  }

  return (
    <div className="h-full">
      <ChatInterface eventId={id} initialMessages={chatHistory} />
    </div>
  )
}
