'use client'

import { ParsedResponse } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { format } from 'date-fns'

interface ParsedFactsCardProps {
  parsed: ParsedResponse | null
}

export function ParsedFactsCard({ parsed }: ParsedFactsCardProps) {
  if (!parsed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Parsed Facts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No parsed data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Parsed Facts</span>
          <Badge
            variant={
              parsed.confidence === 'HIGH'
                ? 'default'
                : parsed.confidence === 'MEDIUM'
                ? 'secondary'
                : 'destructive'
            }
          >
            {parsed.confidence} Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Availability */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Availability
          </h4>
          {parsed.availability && parsed.availability.length > 0 ? (
            <ul className="space-y-1">
              {parsed.availability.map((avail: any, idx: number) => (
                <li key={idx} className="text-sm">
                  {format(new Date(avail.date), 'MMMM d, yyyy')}
                  {avail.time && ` at ${avail.time}`}
                  {avail.capacity && ` (capacity: ${avail.capacity})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Not specified</p>
          )}
        </div>

        {/* Quote */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Quote</h4>
          {parsed.quote ? (
            <div>
              <p className="text-lg font-bold">
                ${(parsed.quote as any).amount?.toLocaleString() || 'N/A'}{' '}
                {(parsed.quote as any).currency || 'USD'}
              </p>
              {(parsed.quote as any).breakdown &&
                (parsed.quote as any).breakdown.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {(parsed.quote as any).breakdown.map(
                      (item: any, idx: number) => (
                        <li key={idx} className="flex justify-between text-sm">
                          <span>{item.item}</span>
                          <span className="font-medium">
                            ${item.amount.toLocaleString()}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not provided</p>
          )}
        </div>

        {/* Inclusions */}
        {parsed.inclusions && parsed.inclusions.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Inclusions
            </h4>
            <ul className="list-inside list-disc space-y-1">
              {parsed.inclusions.map((item, idx) => (
                <li key={idx} className="text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions */}
        {parsed.questions && parsed.questions.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Vendor Questions
            </h4>
            <ul className="list-inside list-disc space-y-1">
              {parsed.questions.map((question, idx) => (
                <li key={idx} className="text-sm text-orange-600">
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sentiment */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Sentiment
          </h4>
          <Badge
            variant={
              parsed.sentiment === 'positive'
                ? 'default'
                : parsed.sentiment === 'negative'
                ? 'destructive'
                : 'secondary'
            }
          >
            {parsed.sentiment || 'neutral'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
