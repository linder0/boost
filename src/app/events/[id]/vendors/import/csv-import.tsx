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
import { bulkCreateVendors } from '@/app/actions/vendors'

interface VendorRow {
  name: string
  category: string
  contact_email: string
}

export function CSVImport({ eventId }: { eventId: string }) {
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

    if (nameIdx === -1 || categoryIdx === -1 || emailIdx === -1) {
      throw new Error('CSV must have Name, Category, and Email columns')
    }

    const vendors: VendorRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      if (values.length < 3) continue

      vendors.push({
        name: values[nameIdx],
        category: values[categoryIdx],
        contact_email: values[emailIdx],
      })
    }

    return vendors
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setLoading(true)
    setError(null)

    try {
      await bulkCreateVendors(eventId, preview)
      router.push(`/events/${eventId}/vendors`)
    } catch (err: any) {
      setError(err.message || 'Failed to import vendors')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Import Vendors from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with columns: Name, Category, Email
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
            Expected format: Name, Category, Email (or Contact_Email)
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((vendor, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{vendor.name}</TableCell>
                        <TableCell>{vendor.category}</TableCell>
                        <TableCell>{vendor.contact_email}</TableCell>
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
                onClick={() => router.push(`/events/${eventId}/vendors`)}
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
