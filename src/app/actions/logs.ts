'use server'

import { getAuthenticatedClient, handleSupabaseError } from '@/lib/supabase/server'
import { AutomationLog, LogEventType } from '@/types/database'
import { validateUUID } from '@/lib/utils'

export async function getAutomationLogs(
  eventId: string,
  filterType?: LogEventType
) {
  validateUUID(eventId, 'event ID')

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

  handleSupabaseError(error, 'Failed to fetch logs')
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
