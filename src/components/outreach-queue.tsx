'use client'

/**
 * @deprecated Outreach Queue is deferred in the VRM simplification.
 * This component will be updated when email automation is re-added.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { EntityWithStatus } from '@/types/database'

interface OutreachQueueProps {
  vendors: EntityWithStatus[]
  eventId: string
  eventName: string
}

export function OutreachQueue({ vendors, eventId, eventName }: OutreachQueueProps) {
  // Filter to only show entities pending action
  const pendingVendors = vendors.filter((v) => {
    return v.event_entity?.status === 'discovered'
  })

  if (pendingVendors.length === 0) {
    return null
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Outreach Queue</CardTitle>
        <CardDescription>
          {pendingVendors.length} venue{pendingVendors.length !== 1 ? 's' : ''} ready for outreach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Email outreach automation is coming soon. For now, you can manually contact venues
          by clicking on them in the table above.
        </p>
      </CardContent>
    </Card>
  )
}
