import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Wrench, Terminal, Settings as SettingsIcon } from 'lucide-react'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tools', icon: Wrench, label: 'Tools' },
    { path: '/test-console', icon: Terminal, label: 'Test Console' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' }
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'w-64 flex flex-col border-r border-border-dark bg-background-dark shrink-0',
        className
      )}
    >
      <div className="p-4 flex flex-col gap-6 h-full">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
            <Wrench className="size-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">MCP Builder</h1>
            <p className="text-xs text-text-secondary font-medium">v1.0.0</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-dark hover:text-white'
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User/Bottom */}
        <div className="mt-auto border-t border-border-dark pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="size-9 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              MC
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">MCP User</span>
              <span className="text-xs text-text-secondary truncate">Development</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
