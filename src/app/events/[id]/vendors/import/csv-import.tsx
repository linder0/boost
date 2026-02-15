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
  price_per_person: string
  website: string
  contact_email: string
  custom_message: string
}

// Flexible header matching — maps common CSV header names to our fields
function matchHeader(header: string): keyof VendorRow | null {
  const h = header.toLowerCase().trim()
  if (['vendor name', 'vendor', 'name'].includes(h)) return 'name'
  if (['price per person', 'price', 'price_per_person', 'ppp', 'cost'].includes(h)) return 'price_per_person'
  if (['link', 'website', 'url', 'site'].includes(h)) return 'website'
  if (['contact', 'email', 'contact_email', 'contact email'].includes(h)) return 'contact_email'
  if (['outreach message', 'outreach_message', 'message', 'outreach'].includes(h)) return 'custom_message'
  return null
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
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(selectedFile)
  }

  // Full CSV parser that handles multi-line quoted fields
  const parseCSVRows = (text: string): string[][] => {
    const rows: string[][] = []
    let current = ''
    let inQuotes = false
    let row: string[] = []

    for (let i = 0; i < text.length; i++) {
      const char = text[i]

      if (char === '"') {
        // Handle escaped quotes ("") inside quoted fields
        if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
          current += '"'
          i++ // skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // Skip \r in \r\n
        if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++
        }
        row.push(current.trim())
        if (row.some(cell => cell !== '')) {
          rows.push(row)
        }
        row = []
        current = ''
      } else {
        current += char
      }
    }

    // Last row
    row.push(current.trim())
    if (row.some(cell => cell !== '')) {
      rows.push(row)
    }

    return rows
  }

  const parseCSV = (text: string): VendorRow[] => {
    const rows = parseCSVRows(text)
    if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row')

    // Parse headers with flexible matching
    const rawHeaders = rows[0].map((h) => h.replace(/^"|"$/g, ''))
    const headerMap: { index: number; field: keyof VendorRow }[] = []

    for (let i = 0; i < rawHeaders.length; i++) {
      const field = matchHeader(rawHeaders[i])
      if (field) {
        headerMap.push({ index: i, field })
      }
    }

    // Require at least name and contact
    const mappedFields = headerMap.map((h) => h.field)
    if (!mappedFields.includes('name')) {
      throw new Error('CSV must have a "Vendor Name" (or "Name") column')
    }
    if (!mappedFields.includes('contact_email')) {
      throw new Error('CSV must have a "Contact" (or "Email") column')
    }

    const vendors: VendorRow[] = []
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i]

      const row: VendorRow = {
        name: '',
        price_per_person: '',
        website: '',
        contact_email: '',
        custom_message: '',
      }

      for (const { index, field } of headerMap) {
        if (index < values.length) {
          row[field] = values[index]
        }
      }

      // Skip rows without a name
      if (row.name) {
        vendors.push(row)
      }
    }

    return vendors
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setLoading(true)
    setError(null)

    try {
      await bulkCreateVendors(
        eventId,
        preview.map((v) => ({
          name: v.name,
          contact_email: v.contact_email || `${v.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@pending.local`,
          website: v.website || null,
          custom_message: v.custom_message || null,
          price_per_person: v.price_per_person || null,
        }))
      )
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
          Upload a CSV with columns: Vendor Name, Price Per Person, Link, Contact, Outreach Message
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
            Required columns: Vendor Name, Contact. Optional: Price Per Person, Link, Outreach Message.
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
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Price / Person</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Outreach Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((vendor, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.price_per_person || '—'}</TableCell>
                        <TableCell>
                          {vendor.website ? (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate block max-w-[200px]"
                            >
                              {vendor.website}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{vendor.contact_email || '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {vendor.custom_message || '—'}
                        </TableCell>
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
