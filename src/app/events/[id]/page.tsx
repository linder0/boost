import { Suspense } from 'react'
import { getEvent } from '@/app/actions/events'
import { getEntitiesByEvent } from '@/app/actions/entities'
import { EventHeader } from '@/components/event-header'
import { EventTabs } from '@/components/event-tabs'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [event, entities] = await Promise.all([
    getEvent(id),
    getEntitiesByEvent(id),
  ])

  return (
    <div className="flex flex-col h-screen">
      <EventHeader event={event} />
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
        <EventTabs event={event} entities={entities} />
      </Suspense>
    </div>
  )
}
