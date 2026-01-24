import { CSVImport } from './csv-import'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function ImportVendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <CSVImport eventId={id} />
    </div>
  )
}
