import { listUserEvents } from '@/app/actions/events'
import { EventsList } from '@/components/events-list'
import { Button } from '@/components/ui/button'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'
import Link from 'next/link'

export default async function EventsPage() {
  const events = await listUserEvents()

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Events</h1>
          <p className="text-muted-foreground">Manage your event vendor outreach</p>
        </div>
        <Link href="/events/new">
          <Button>Create New Event</Button>
        </Link>
      </div>

      <EventsList events={events} />
    </div>
  )
}
