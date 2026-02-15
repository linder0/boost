'use client'

import { usePathname, useRouter } from 'next/navigation'

export function ProposalLink() {
  const pathname = usePathname()
  const router = useRouter()

  // Extract event ID from pathname: /events/[id]/...
  const eventId = pathname.split('/')[2]

  const handleClick = () => {
    if (eventId) {
      router.push(`/events/${eventId}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="shrink-0 mt-1 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
    >
      View Proposal
    </button>
  )
}
