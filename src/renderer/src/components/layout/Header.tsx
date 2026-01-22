import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function Header({ title, description, actions, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'h-20 border-b border-border-dark bg-background-dark flex items-center justify-between px-8 shrink-0',
        className
      )}
    >
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </header>
  )
}
