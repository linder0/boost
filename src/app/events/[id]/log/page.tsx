import { getAutomationLogs } from '@/app/actions/logs'
import { getEvent } from '@/app/actions/events'
import { AutomationLogTable } from './automation-log-table'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function AutomationLogPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await Promise.resolve(params)

  const [event, logs] = await Promise.all([
    getEvent(id),
    getAutomationLogs(id),
  ])

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Automation Log</h1>
        <p className="text-muted-foreground">{event.name}</p>
      </div>

      <AutomationLogTable logs={logs} eventId={id} />
    </div>
  )
}
