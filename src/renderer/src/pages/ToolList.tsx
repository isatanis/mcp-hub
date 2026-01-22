import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Plus, Search, Grid3x3, List, Cloud, Terminal, FileCode, MoreVertical, Upload } from 'lucide-react'
import { useToolStore } from '@/store/toolStore'
import { ImportWizard } from '@/components/tools/ImportWizard'
import type { Tool, HttpConfig } from '@shared/types'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'

export function ToolList() {
  const navigate = useNavigate()
  const { tools, isLoading, fetchTools, saveTool } = useToolStore()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showImportWizard, setShowImportWizard] = useState(false)

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

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

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === 'all' || tool.executorType === typeFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'enabled' ? tool.enabled : !tool.enabled)

    return matchesSearch && matchesType && matchesStatus
  })

  const handleToggleEnabled = async (tool: Tool) => {
    await saveTool(tool.id, { enabled: !tool.enabled })
  }

  const handleImport = async (spec: string) => {
    // TODO: Parse OpenAPI spec and create tools
    console.log('Importing spec:', spec)
  }

  return (
    <>
      <Header
        title="Tool Library"
        description="Manage your MCP tool definitions and server capabilities"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowImportWizard(true)}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button onClick={() => navigate('/tools/new')}>
              <Plus className="size-4" />
              New Tool
            </Button>
          </div>
        }
      />
      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onImport={handleImport}
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
          ) : filteredTools.length === 0 ? (
            <div className="text-center text-text-secondary py-12">
              {tools.length === 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <p>No tools yet. Create your first tool to get started.</p>
                  <Button onClick={() => navigate('/tools/new')}>
                    <Plus className="size-4" />
                    Create First Tool
                  </Button>
                </div>
              ) : (
                <p>No tools match your search criteria.</p>
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
              {filteredTools.map((tool) => {
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
                      <Switch
                        checked={tool.enabled}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleEnabled(tool)
                        }}
                      />
                    </div>
                  </Card>
                )
              })}

              {/* Add New Tool Card */}
              <button
                onClick={() => navigate('/tools/new')}
                className="group flex flex-col items-center justify-center bg-surface-dark/30 border border-dashed border-border-dark hover:border-primary hover:bg-surface-dark/50 rounded-xl p-5 transition-all duration-200 min-h-[220px]"
              >
                <div className="h-12 w-12 rounded-full bg-border-dark flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors mb-4">
                  <Plus className="size-7" />
                </div>
                <h3 className="text-white font-medium text-lg">Create New Tool</h3>
                <p className="text-text-secondary text-sm mt-1 text-center">
                  Start from scratch or import definition
                </p>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
