import { Button } from './ui/button'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'dashed'
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
}: EmptyStateProps) {
  const containerClass =
    variant === 'dashed'
      ? 'flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center'
      : 'flex flex-col items-center justify-center py-16 text-center'

  return (
    <div className={containerClass}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-4 flex gap-2">
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
        </div>
      )}
    </div>
  )
}
