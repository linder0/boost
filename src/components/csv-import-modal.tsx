'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'
import { createEntitiesFromImport, type ImportedEntityInput } from '@/app/actions/entities'
import type { TabCategory } from '@/types/entities'

interface CSVImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  category: TabCategory
  categoryLabel: string
  /** Tags to auto-apply to imported entities */
  defaultTags: string[]
}

interface ParsedRow {
  name: string
  email?: string
  phone?: string
  website?: string
  location?: string
  city?: string
  description?: string
  // Guest-specific
  company?: string
  title?: string
  dietary?: string
  rsvpStatus?: string
  // Catch-all for extra columns
  [key: string]: string | undefined
}

// Known column aliases that map to our fields
const COLUMN_ALIASES: Record<string, string> = {
  'name': 'name',
  'company name': 'name',
  'vendor': 'name',
  'business': 'name',
  'email': 'email',
  'email address': 'email',
  'contact email': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'telephone': 'phone',
  'website': 'website',
  'url': 'website',
  'site': 'website',
  'location': 'location',
  'address': 'location',
  'city': 'city',
  'description': 'description',
  'notes': 'description',
  'about': 'description',
  'bio': 'description',
  // Guest-specific
  'company': 'company',
  'organization': 'company',
  'org': 'company',
  'title': 'title',
  'role': 'title',
  'position': 'title',
  'job title': 'title',
  'dietary': 'dietary',
  'dietary restrictions': 'dietary',
  'diet': 'dietary',
  'allergies': 'dietary',
  'rsvp': 'rsvpStatus',
  'rsvp status': 'rsvpStatus',
  'status': 'rsvpStatus',
  'attending': 'rsvpStatus',
}

function parseCSV(text: string): { headers: string[], rows: Record<string, string>[] } {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  const rows = lines.slice(1).map(line => {
    // Handle quoted CSV fields
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      if (i < values.length && values[i]) {
        row[header] = values[i]
      }
    })
    return row
  }).filter(row => Object.values(row).some(v => v))

  return { headers, rows }
}

function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim()
    if (COLUMN_ALIASES[normalized]) {
      mapping[header] = COLUMN_ALIASES[normalized]
    }
  })

  return mapping
}

function rowToEntity(row: Record<string, string>, columnMapping: Record<string, string>, tags: string[]): ImportedEntityInput {
  const mapped: Record<string, string> = {}

  Object.entries(row).forEach(([header, value]) => {
    const field = columnMapping[header]
    if (field && value) {
      mapped[field] = value
    }
  })

  // Collect unmapped fields as metadata
  const extraMetadata: Record<string, unknown> = {}
  Object.entries(row).forEach(([header, value]) => {
    if (!columnMapping[header] && value) {
      extraMetadata[header.toLowerCase().replace(/\s+/g, '_')] = value
    }
  })

  // Add guest-specific fields to metadata
  if (mapped.company) extraMetadata.company = mapped.company
  if (mapped.title) extraMetadata.title = mapped.title
  if (mapped.dietary) extraMetadata.dietary = mapped.dietary
  if (mapped.rsvpStatus) extraMetadata.rsvp_status = mapped.rsvpStatus

  return {
    name: mapped.name || 'Unknown',
    tags,
    email: mapped.email,
    phone: mapped.phone,
    website: mapped.website,
    location: mapped.location,
    city: mapped.city,
    description: mapped.description,
    metadata: Object.keys(extraMetadata).length > 0 ? extraMetadata : undefined,
  }
}

export function CSVImportModal({
  open,
  onOpenChange,
  eventId,
  category,
  categoryLabel,
  defaultTags,
}: CSVImportModalProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const { headers: parsedHeaders, rows: parsedRows } = parseCSV(text)

        if (parsedRows.length === 0) {
          setError('No data rows found in CSV')
          return
        }

        setHeaders(parsedHeaders)
        setRows(parsedRows)
        setColumnMapping(mapColumns(parsedHeaders))
      } catch {
        setError('Failed to parse CSV file')
      }
    }
    reader.readAsText(selectedFile)
  }, [])

  const handleImport = async () => {
    if (rows.length === 0) return

    // Check if we have a name mapping
    const hasNameMapping = Object.values(columnMapping).includes('name')
    if (!hasNameMapping) {
      setError('Please ensure at least one column maps to "name"')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const entities = rows.map(row => rowToEntity(row, columnMapping, defaultTags))
      const validEntities = entities.filter(e => e.name && e.name !== 'Unknown')

      if (validEntities.length === 0) {
        setError('No valid rows found (all missing name)')
        return
      }

      await createEntitiesFromImport(validEntities, eventId)

      // Reset and close
      setFile(null)
      setHeaders([])
      setRows([])
      setColumnMapping({})
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setHeaders([])
    setRows([])
    setColumnMapping({})
    setError(null)
  }

  const mappedFieldCount = Object.values(columnMapping).filter(v => v).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {categoryLabel}</DialogTitle>
          <DialogDescription>
            Upload a CSV export from Paradigm AI or any spreadsheet.
            Columns will be auto-mapped.
          </DialogDescription>
        </DialogHeader>

        {/* File upload */}
        {!file ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Drop a CSV file here or click to browse
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs mx-auto"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">{rows.length} rows</Badge>
                <Badge variant="outline">{mappedFieldCount}/{headers.length} columns mapped</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Change file
              </Button>
            </div>

            {/* Tags preview */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {defaultTags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            {/* Preview table */}
            <div className="max-h-60 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map(header => (
                      <TableHead key={header} className="text-xs">
                        <div>
                          {header}
                          {columnMapping[header] && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1">
                              {columnMapping[header]}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      {headers.map(header => (
                        <TableCell key={header} className="text-xs max-w-[200px] truncate">
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 5 of {rows.length} rows
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || rows.length === 0}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {rows.length} {categoryLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
