'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExternalLink, Mail, Phone, Trash2 } from 'lucide-react'
import { updateEventEntityStatus, unlinkEntityFromEvent, type EntityWithEventStatus } from '@/app/actions/entities'

const STATUS_OPTIONS = [
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'booked', label: 'Booked', color: 'bg-green-100 text-green-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
] as const

interface VendorTableProps {
  vendors: EntityWithEventStatus[]
  eventId: string
  /** Columns to show beyond name and status */
  columns?: ('email' | 'phone' | 'location' | 'website' | 'description' | 'tags')[]
}

function getStatusBadge(status: string) {
  const config = STATUS_OPTIONS.find(s => s.value === status)
  if (!config) return <Badge variant="secondary">{status}</Badge>
  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  )
}

export function VendorTable({ vendors, eventId, columns = ['email', 'location'] }: VendorTableProps) {
  const router = useRouter()

  const handleStatusChange = async (entityId: string, newStatus: string) => {
    await updateEventEntityStatus(eventId, entityId, newStatus)
    router.refresh()
  }

  const handleRemove = async (entityId: string) => {
    await unlinkEntityFromEvent(eventId, entityId)
    router.refresh()
  }

  if (vendors.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {columns.includes('email') && <TableHead>Contact</TableHead>}
            {columns.includes('location') && <TableHead>Location</TableHead>}
            {columns.includes('website') && <TableHead>Website</TableHead>}
            {columns.includes('description') && <TableHead>Notes</TableHead>}
            {columns.includes('tags') && <TableHead>Tags</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => {
            const status = vendor.event_entity?.status || 'shortlisted'

            return (
              <TableRow key={vendor.id}>
                <TableCell>
                  <div className="font-medium">{vendor.name}</div>
                  {vendor.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">
                      {vendor.description}
                    </div>
                  )}
                </TableCell>
                {columns.includes('email') && (
                  <TableCell>
                    <div className="space-y-0.5">
                      {vendor.metadata?.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <a href={`mailto:${vendor.metadata.email}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                            {vendor.metadata.email}
                          </a>
                        </div>
                      )}
                      {vendor.metadata?.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {vendor.metadata.phone}
                        </div>
                      )}
                      {!vendor.metadata?.email && !vendor.metadata?.phone && (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                )}
                {columns.includes('location') && (
                  <TableCell>
                    <span className="text-sm">
                      {vendor.neighborhood || vendor.city || vendor.location || '-'}
                    </span>
                  </TableCell>
                )}
                {columns.includes('website') && (
                  <TableCell>
                    {vendor.website ? (
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                {columns.includes('description') && (
                  <TableCell>
                    <span className="text-sm max-w-[200px] block truncate">
                      {vendor.description || vendor.event_entity?.notes || '-'}
                    </span>
                  </TableCell>
                )}
                {columns.includes('tags') && (
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {vendor.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Select
                    value={status}
                    onValueChange={(value) => handleStatusChange(vendor.id, value)}
                  >
                    <SelectTrigger className="h-7 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(vendor.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
