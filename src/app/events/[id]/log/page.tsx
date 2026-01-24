import { getAutomationLogs } from '@/app/actions/logs'
import { AutomationLogTable } from './automation-log-table'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function AutomationLogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const logs = await getAutomationLogs(id)

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <AutomationLogTable logs={logs} eventId={id} />
    </div>
  )
}
