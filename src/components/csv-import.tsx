'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createEntitiesFromDiscovery, DiscoveredEntityInput } from '@/app/actions/entities'

interface VendorRow {
  name: string
  category: string
  contact_email: string
  location?: string
  website?: string
}

export function CSVImport() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const rows = parseCSV(text)
        setPreview(rows)
      } catch (err) {
        setError('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(selectedFile)
  }

  const parseCSV = (text: string): VendorRow[] => {
    const lines = text.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim())

    const nameIdx = headers.indexOf('name')
    const categoryIdx = headers.indexOf('category')
    const emailIdx = headers.indexOf('email') !== -1 
      ? headers.indexOf('email') 
      : headers.indexOf('contact_email')
    const locationIdx = headers.indexOf('location')
    const websiteIdx = headers.indexOf('website')

    if (nameIdx === -1) {
      throw new Error('CSV must have a Name column')
    }

    const vendors: VendorRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      if (values.length < 1) continue

      vendors.push({
        name: values[nameIdx],
        category: categoryIdx !== -1 ? values[categoryIdx] : 'restaurant',
        contact_email: emailIdx !== -1 ? values[emailIdx] : '',
        location: locationIdx !== -1 ? values[locationIdx] : undefined,
        website: websiteIdx !== -1 ? values[websiteIdx] : undefined,
      })
    }

    return vendors
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Convert to DiscoveredEntityInput format
      const entities: DiscoveredEntityInput[] = preview.map(row => ({
        name: row.name,
        tags: [row.category || 'restaurant'],
        email: row.contact_email,
        location: row.location,
        website: row.website,
      }))

      await createEntitiesFromDiscovery(entities)
      router.push('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import vendors'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Import Vendors from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with columns: Name, Category (optional), Email (optional), Location (optional), Website (optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
          <p className="text-sm text-muted-foreground">
            Required: Name column. Optional: Category, Email, Location, Website
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {preview.length > 0 && (
          <>
            <div>
              <h3 className="mb-2 font-semibold">
                Preview ({preview.length} vendors)
              </h3>
              <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((vendor, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{vendor.name}</TableCell>
                        <TableCell>{vendor.category || '-'}</TableCell>
                        <TableCell>{vendor.contact_email || '-'}</TableCell>
                        <TableCell>{vendor.location || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Importing...' : `Import ${preview.length} Vendors`}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
