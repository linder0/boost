import { getAllEvents } from '@/app/actions/events'
import { EventList } from '@/components/event-list'

export default async function HomePage() {
  const events = await getAllEvents()

  return <EventList events={events} />
}
