import { listUserEvents } from '@/app/actions/events'
import { EventsList } from '@/components/events-list'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function EventsPage() {
  const events = await listUserEvents()

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Your Events</h1>
        <p className="text-muted-foreground">Manage your event vendor outreach</p>
      </div>

      <EventsList events={events} />
    </div>
  )
}
