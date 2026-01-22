import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Wrench, CheckCircle2, XCircle, Activity, TrendingUp, Clock } from 'lucide-react'
import { useToolStore } from '@/store/toolStore'
import type { Tool } from '@shared/types'

export function Dashboard() {
  const navigate = useNavigate()
  const { tools, fetchTools } = useToolStore()
  const [recentTools, setRecentTools] = useState<Tool[]>([])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  useEffect(() => {
    // Sort by updatedAt and get most recent 5
    const sorted = [...tools].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    setRecentTools(sorted.slice(0, 5))
  }, [tools])

  const stats = {
    totalTools: tools.length,
    enabledTools: tools.filter((t) => t.enabled).length,
    disabledTools: tools.filter((t) => !t.enabled).length,
    httpTools: tools.filter((t) => t.executorType === 'http').length
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <>
      <Header
        title="Dashboard Overview"
        description="Monitor your MCP server and tool performance"
        actions={
          <Button onClick={() => navigate('/tools/new')}>
            <Plus className="size-4" />
            New Tool
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Tools</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalTools}</p>
                  </div>
                  <div className="bg-primary/20 p-3 rounded-lg">
                    <Wrench className="size-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Enabled</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.enabledTools}</p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <CheckCircle2 className="size-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Disabled</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.disabledTools}</p>
                  </div>
                  <div className="bg-orange-500/20 p-3 rounded-lg">
                    <XCircle className="size-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">HTTP Tools</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.httpTools}</p>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <Activity className="size-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate('/tools/new')}
                  className="flex items-center gap-3 p-4 bg-surface-dark hover:bg-surface-dark/70 rounded-lg border border-border-dark transition-all group"
                >
                  <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-colors">
                    <Plus className="size-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Create New Tool</p>
                    <p className="text-xs text-text-secondary">Start from scratch</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/test-console')}
                  className="flex items-center gap-3 p-4 bg-surface-dark hover:bg-surface-dark/70 rounded-lg border border-border-dark transition-all group"
                >
                  <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <Activity className="size-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Test Tools</p>
                    <p className="text-xs text-text-secondary">Run test console</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-3 p-4 bg-surface-dark hover:bg-surface-dark/70 rounded-lg border border-border-dark transition-all group"
                >
                  <div className="bg-purple-500/20 p-2 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <TrendingUp className="size-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Export Config</p>
                    <p className="text-xs text-text-secondary">For Claude/Cursor</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tools */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recently Updated Tools</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTools.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">No tools yet. Create your first tool to get started.</p>
                  <Button onClick={() => navigate('/tools/new')}>
                    <Plus className="size-4" />
                    Create First Tool
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => navigate(`/tools/${tool.id}`)}
                      className="w-full flex items-center justify-between p-4 bg-surface-dark hover:bg-surface-dark/70 rounded-lg border border-border-dark transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Wrench className="size-5 text-primary" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{tool.name}</p>
                          <p className="text-xs text-text-secondary truncate">{tool.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Clock className="size-3" />
                          {getRelativeTime(tool.updatedAt)}
                        </div>
                        <Badge variant={tool.enabled ? 'success' : 'secondary'} className="text-[10px]">
                          {tool.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
