'use server'

import { getAuthenticatedClient } from '@/lib/supabase/server'
import { AutomationLog, LogEventType } from '@/types/database'
import { isValidUUID } from '@/lib/utils'

export async function getAutomationLogs(
  eventId: string,
  filterType?: LogEventType
) {
  if (!isValidUUID(eventId)) {
    console.warn('Invalid event ID format:', eventId)
    return [] as (AutomationLog & { vendors: { name: string } | null })[]
  }

  const { supabase } = await getAuthenticatedClient()

  let query = supabase
    .from('automation_logs')
    .select('*, vendors(name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (filterType) {
    query = query.eq('event_type', filterType)
  }

  const { data: logs, error } = await query

  if (error && Object.keys(error).length > 0) {
    console.error('Error fetching logs:', error)
    throw new Error('Failed to fetch logs')
  }

  return (logs ?? []) as (AutomationLog & { vendors: { name: string } | null })[]
}

export async function exportLogsToCSV(eventId: string) {
  const logs = await getAutomationLogs(eventId)

  const csvRows = [
    ['Timestamp', 'Vendor', 'Event Type', 'Details'].join(','),
    ...logs.map((log) =>
      [
        new Date(log.created_at).toISOString(),
        log.vendors?.name || 'N/A',
        log.event_type,
        JSON.stringify(log.details).replace(/"/g, '""'),
      ]
        .map((field) => `"${field}"`)
        .join(',')
    ),
  ]

  return csvRows.join('\n')
}
