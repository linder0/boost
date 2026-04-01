'use client'

import { useState } from 'react'
import { EventProposal } from '@/components/event-proposal'
import { EventIntakeForm } from '@/components/event-intake-form'
import { Event } from '@/types/database'

interface EventInfoProps {
  event: Event
}

export function EventInfo({ event }: EventInfoProps) {
  // The proposal only reflects the last saved state.
  // It initialises from the server-fetched event and only updates
  // when the form explicitly saves (via the onSave callback).
  const [savedEvent, setSavedEvent] = useState<Event>(event)

  return (
    <>
      <div className="mx-auto w-full max-w-2xl">
        <EventProposal event={savedEvent} />
      </div>
      <EventIntakeForm event={event} onSave={setSavedEvent} />
    </>
  )
}
