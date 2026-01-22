import { EventIntakeForm } from '@/components/event-intake-form'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default function NewEventPage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <EventIntakeForm />
    </div>
  )
}
