import { getEvent } from '@/app/actions/events'
import { EventIntakeForm } from '@/components/event-intake-form'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'
import { notFound } from 'next/navigation'

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  
  let event
  try {
    event = await getEvent(id)
  } catch {
    notFound()
  }

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <EventIntakeForm event={event} />
    </div>
  )
}
