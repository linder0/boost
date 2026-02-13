import { CSVImport } from '@/components/csv-import'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default function ImportPage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="w-full max-w-4xl mx-auto">
        <CSVImport />
      </div>
    </div>
  )
}
