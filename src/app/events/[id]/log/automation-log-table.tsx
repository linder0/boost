'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LogEventType, AutomationLog } from '@/types/database'
import { exportLogsToCSV } from '@/app/actions/logs'

interface AutomationLogTableProps {
  logs: (AutomationLog & { vendors: { name: string } | null })[]
  eventId: string
}

export function AutomationLogTable({ logs, eventId }: AutomationLogTableProps) {
  const [filter, setFilter] = useState<LogEventType | 'ALL'>('ALL')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const filteredLogs =
    filter === 'ALL' ? logs : logs.filter((log) => log.event_type === filter)

  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = await exportLogsToCSV(eventId)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `automation-log-${eventId}-${Date.now()}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export logs:', error)
    } finally {
      setExporting(false)
    }
  }

  const getEventTypeBadgeVariant = (type: LogEventType) => {
    switch (type) {
      case 'OUTREACH':
        return 'default'
      case 'FOLLOW_UP':
        return 'secondary'
      case 'REPLY':
        return 'outline'
      case 'PARSE':
        return 'secondary'
      case 'DECISION':
        return 'default'
      case 'ESCALATION':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ALL')}
          >
            All ({logs.length})
          </Button>
          {(['OUTREACH', 'FOLLOW_UP', 'REPLY', 'PARSE', 'DECISION', 'ESCALATION'] as LogEventType[]).map(
            (type) => (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(type)}
              >
                {type.replace('_', ' ')} (
                {logs.filter((l) => l.event_type === type).length})
              </Button>
            )
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No logs found{filter !== 'ALL' && ` for ${filter}`}
          </p>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <>
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{log.vendors?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getEventTypeBadgeVariant(log.event_type)}>
                        {log.event_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {log.details?.summary ||
                        log.details?.subject ||
                        log.details?.reason ||
                        'See details'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === log.id ? null : log.id
                          )
                        }
                      >
                        {expandedRow === log.id ? 'Hide' : 'Show'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRow === log.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted">
                        <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
