import { CSVImport } from './csv-import'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default function ImportVendorsPage({ params }: { params: { id: string } }) {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <CSVImport eventId={params.id} />
    </div>
  )
}
