import { getEvent } from '@/app/actions/events'
import { EventTabs } from './event-tabs'
import { ProposalLink } from './proposal-link'
import { formatCurrency } from '@/lib/utils'
import { notFound } from 'next/navigation'

interface EventLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { id } = await params

  let event
  try {
    event = await getEvent(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Persistent Header */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <p className="text-muted-foreground">
            {event.city || 'No city set'} &bull; {event.headcount} guests &bull; {formatCurrency(event.total_budget)} budget
          </p>
        </div>
        <ProposalLink />
      </div>

      {/* Tabs Navigation */}
      <div className="px-8 border-b">
        <EventTabs />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
