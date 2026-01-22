import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Tool } from '@shared/types'
import { Cloud, FileCode, Grid3x3, List, Plus, Search, Terminal } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type ViewMode = 'grid' | 'list'

export function ExecutionLogs() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const isLoading = false;
  const logs = []
  const filteredLogs = []


  const getToolIcon = (type: Tool['executorType']) => {
    switch (type) {
      case 'http':
        return Cloud
      case 'cli':
        return Terminal
      case 'script':
        return FileCode
      default:
        return Cloud
    }
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'POST':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'PUT':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'DELETE':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getAuthBadge = (tool: Tool) => {
    if (tool.auth.type === 'none') return null
    return (
      <div className="flex items-center gap-1 text-xs text-text-secondary bg-background-dark/50 px-2 py-1 rounded border border-border-dark">
        <span className="text-[14px]">🔒</span>
        <span>{tool.auth.type.replace('_', ' ')}</span>
      </div>
    )
  }


  return (
    <>
      <Header
        title="Execution Logs"
        description="Find execution logs of tool calls"
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Search */}
            <div className="relative w-full lg:max-w-[400px] group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary group-focus-within:text-primary transition-colors">
                <Search className="size-5" />
              </div>
              <Input
                className="pl-10"
                placeholder="Search tools by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="min-w-[140px]">
                <option value="all">All Types</option>
                <option value="http">HTTP</option>
                <option value="cli">CLI</option>
                <option value="script">Script</option>
              </Select>

              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[140px]">
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </Select>

              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tools Grid/List */}
          {isLoading ? (
            <div className="text-center text-text-secondary py-12">Loading tools...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-text-secondary py-12">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <p>No logs yet. Make some tool calls from Agents</p>
                </div>
              ) : (
                <p>No logs match your search criteria.</p>
              )}
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
              )}
            >
              {/* {filteredLogs.map((tool) => {
                const Icon = getToolIcon(tool.executorType)
                const httpConfig = tool.executorType === 'http' ? (tool.executorConfig as HttpConfig) : null

                return (
                  <Card
                    key={tool.id}
                    className="group flex flex-col p-5 hover:border-primary/50 transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/tools/${tool.id}`)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                          <Icon className="size-6" />
                        </div>
                        <h3 className="text-white font-bold text-lg leading-tight">{tool.name}</h3>
                      </div>
                      <button
                        className="text-text-secondary hover:text-white transition-colors rounded hover:bg-white/5 p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: Open context menu
                        }}
                      >
                        <MoreVertical className="size-5" />
                      </button>
                    </div>

                    <p className="text-text-secondary text-sm mb-6 line-clamp-2 h-10">{tool.description}</p>

                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                      {httpConfig && (
                        <Badge className={cn('text-[10px] font-bold tracking-wider uppercase', getMethodBadgeColor(httpConfig.method))}>
                          {httpConfig.method}
                        </Badge>
                      )}
                      {getAuthBadge(tool)}
                    </div>

                    <div className="mt-auto pt-4 border-t border-border-dark flex items-center justify-between">
                      <span className="text-xs font-medium text-white">
                        {tool.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </Card>
                )
              })} */}

            </div>
          )}
        </div>
      </div>
    </>
  )
}
