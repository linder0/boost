import { CSVImport } from '@/components/csv-import'
import { NYCImport } from '@/components/nyc-import'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ImportPage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <Tabs defaultValue="nyc" className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nyc">NYC Open Data</TabsTrigger>
          <TabsTrigger value="csv">Custom CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="nyc" className="mt-6">
          <NYCImport />
        </TabsContent>
        <TabsContent value="csv" className="mt-6">
          <CSVImport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
