import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import type { ExecutionLog } from '@shared/types'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Cloud,
  Terminal,
  FileCode,
  Trash2,
  RefreshCw,
  ChevronRight,
  Bot,
  FlaskConical,
  Copy
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface LogStats {
  totalExecutions: number
  successCount: number
  failureCount: number
  mcpCount: number
  testCount: number
  avgDuration: number
}

interface LogDetailContentProps {
  log: ExecutionLog
  formatDuration: (ms: number) => string
  formatBytes: (bytes: number) => string
  formatTimestamp: (date: Date) => string
}

function LogDetailContent({ log, formatDuration, formatBytes, formatTimestamp }: LogDetailContentProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const request = log.request as Record<string, unknown>
  const response = log.response as Record<string, unknown>

  // Type guards for request/response structure
  const isCliRequest = log.executorType === 'cli' && request && 'raw' in request
  const isHttpRequest = log.executorType === 'http' && request && 'method' in request

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-text-secondary mb-1">Tool</p>
          <p className="font-medium text-white">{log.toolName}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Status</p>
          <Badge variant={log.success ? 'success' : 'danger'}>
            {log.success ? 'Success' : 'Failed'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Source</p>
          <Badge variant={log.source === 'mcp' ? 'default' : 'secondary'}>
            {log.source === 'mcp' ? 'MCP Call' : 'Test'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Duration</p>
          <p className="font-medium text-white">{formatDuration(log.duration)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-text-secondary mb-1">Executor</p>
          <p className="font-medium text-white">{log.executorType.toUpperCase()}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Input Size</p>
          <p className="font-medium text-white">{formatBytes(log.inputSize)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Output Size</p>
          <p className="font-medium text-white">{formatBytes(log.outputSize)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Timestamp</p>
          <p className="font-medium text-white text-sm">{formatTimestamp(log.timestamp)}</p>
        </div>
      </div>

      {/* Error */}
      {log.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm font-mono">{log.error}</p>
        </div>
      )}

      {/* CLI Style Request/Response */}
      {isCliRequest && (
        <>
          {/* Command */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Command</h4>
              <button
                onClick={() => copyToClipboard(String(request.raw || ''))}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-[10px] font-bold bg-purple-500/10 text-purple-400">
                  CLI
                </Badge>
                {typeof request.workingDir === 'string' && request.workingDir && (
                  <span className="text-xs font-mono text-text-secondary">
                    in {request.workingDir}
                  </span>
                )}
              </div>
              <pre className="text-xs font-mono text-white overflow-x-auto whitespace-pre-wrap">
                {String(request.raw)}
              </pre>
            </div>
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Output</h4>
              <button
                onClick={() => copyToClipboard(String((response as { stdout?: string })?.stdout || ''))}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
              <div className="mb-2">
                <Badge
                  variant={(response as { exitCode?: number })?.exitCode === 0 ? 'success' : 'danger'}
                  className="text-[10px]"
                >
                  Exit Code: {(response as { exitCode?: number })?.exitCode}
                </Badge>
              </div>
              {(response as { stdout?: string })?.stdout && (
                <div className="mb-2">
                  <p className="text-xs text-text-secondary mb-1">stdout:</p>
                  <pre className="text-xs font-mono text-white overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {(response as { stdout?: string }).stdout}
                  </pre>
                </div>
              )}
              {(response as { stderr?: string })?.stderr && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">stderr:</p>
                  <pre className="text-xs font-mono text-red-400 overflow-x-auto max-h-32 whitespace-pre-wrap">
                    {(response as { stderr?: string }).stderr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* HTTP Style Request/Response */}
      {isHttpRequest && (
        <>
          {/* Request */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Request</h4>
              <button
                onClick={() => copyToClipboard(JSON.stringify(request, null, 2))}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={cn(
                    'text-[10px] font-bold',
                    request.method === 'GET'
                      ? 'bg-blue-500/10 text-blue-400'
                      : request.method === 'POST'
                        ? 'bg-green-500/10 text-green-400'
                        : request.method === 'PUT'
                          ? 'bg-orange-500/10 text-orange-400'
                          : request.method === 'DELETE'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-gray-500/10 text-gray-400'
                  )}
                >
                  {String(request.method)}
                </Badge>
                <span className="text-xs font-mono text-text-secondary truncate">
                  {String(request.url)}
                </span>
              </div>
              {request.body !== undefined && (
                <pre className="text-xs font-mono text-text-secondary overflow-x-auto max-h-48">
                  {JSON.stringify(request.body, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Response</h4>
              <button
                onClick={() => copyToClipboard(JSON.stringify((response as { body?: unknown })?.body, null, 2))}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
              <div className="mb-2">
                <Badge
                  variant={
                    ((response as { status?: number })?.status || 0) >= 200 &&
                    ((response as { status?: number })?.status || 0) < 300
                      ? 'success'
                      : 'danger'
                  }
                  className="text-[10px]"
                >
                  {(response as { status?: number })?.status}
                </Badge>
              </div>
              <pre className="text-xs font-mono text-white overflow-x-auto max-h-96">
                {JSON.stringify((response as { body?: unknown })?.body, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Fallback for unknown types */}
      {!isCliRequest && !isHttpRequest && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Request</h4>
              <button
                onClick={() => copyToClipboard(JSON.stringify(request, null, 2))}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
              <pre className="text-xs font-mono text-text-secondary overflow-x-auto max-h-48">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Response</h4>
              <button
                onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
              <pre className="text-xs font-mono text-white overflow-x-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ExecutionLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null)
  const [isClearing, setIsClearing] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const options: { source?: string } = {}
      if (sourceFilter !== 'all') {
        options.source = sourceFilter
      }

      const [logsData, statsData] = await Promise.all([
        window.api.logs.getExecutionLogs(options),
        window.api.logs.getStats()
      ])

      // Apply status filter client-side
      let filteredLogs = logsData
      if (statusFilter === 'success') {
        filteredLogs = logsData.filter((log) => log.success)
      } else if (statusFilter === 'failure') {
        filteredLogs = logsData.filter((log) => !log.success)
      }

      setLogs(filteredLogs)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sourceFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all execution logs?')) {
      return
    }
    setIsClearing(true)
    try {
      await window.api.logs.clearLogs()
      await fetchData()
    } catch (error) {
      console.error('Failed to clear logs:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const getExecutorIcon = (type: ExecutionLog['executorType']) => {
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

  const getSourceIcon = (source: ExecutionLog['source']) => {
    return source === 'mcp' ? Bot : FlaskConical
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatTimestamp = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleString()
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
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
        title="Execution Logs"
        description="View execution history from tests and MCP tool calls"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleClearLogs} disabled={isClearing || isLoading}>
              <Trash2 className="size-4" />
              Clear Logs
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Activity className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Total</p>
                      <p className="text-xl font-bold text-white">{stats.totalExecutions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-lg">
                      <CheckCircle2 className="size-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Success</p>
                      <p className="text-xl font-bold text-white">{stats.successCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg">
                      <XCircle className="size-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Failed</p>
                      <p className="text-xl font-bold text-white">{stats.failureCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Bot className="size-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-secondary">MCP Calls</p>
                      <p className="text-xl font-bold text-white">{stats.mcpCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <FlaskConical className="size-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Test Calls</p>
                      <p className="text-xl font-bold text-white">{stats.testCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 p-2 rounded-lg">
                      <Clock className="size-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Avg Duration</p>
                      <p className="text-xl font-bold text-white">{formatDuration(stats.avgDuration)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3">
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="min-w-[140px]"
            >
              <option value="all">All Sources</option>
              <option value="mcp">MCP Calls</option>
              <option value="test">Test Calls</option>
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failed</option>
            </Select>
          </div>

          {/* Logs List */}
          {isLoading ? (
            <div className="text-center text-text-secondary py-12">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-text-secondary py-12">
              <div className="flex flex-col items-center gap-4">
                <Activity className="size-12 text-text-secondary/50" />
                <p>No execution logs yet. Run some tool tests or use tools from Claude/Cursor.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => {
                const ExecutorIcon = getExecutorIcon(log.executorType)
                const SourceIcon = getSourceIcon(log.source)

                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="w-full flex items-center gap-4 p-4 bg-surface-dark hover:bg-surface-dark/70 rounded-lg border border-border-dark transition-all group text-left"
                  >
                    {/* Status Indicator */}
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        log.success ? 'bg-green-500/20' : 'bg-red-500/20'
                      )}
                    >
                      {log.success ? (
                        <CheckCircle2 className="size-5 text-green-400" />
                      ) : (
                        <XCircle className="size-5 text-red-400" />
                      )}
                    </div>

                    {/* Tool Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white truncate">{log.toolName}</span>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ExecutorIcon className="size-3" />
                          {log.executorType.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={log.source === 'mcp' ? 'default' : 'secondary'}
                          className="text-[10px] gap-1"
                        >
                          <SourceIcon className="size-3" />
                          {log.source === 'mcp' ? 'MCP' : 'Test'}
                        </Badge>
                      </div>
                      {log.error && (
                        <p className="text-xs text-red-400 truncate">{log.error}</p>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-6 text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(log.duration)}
                      </div>
                      <div className="hidden md:block">
                        {formatBytes(log.inputSize)} / {formatBytes(log.outputSize)}
                      </div>
                      <div className="text-right min-w-[80px]">{getRelativeTime(log.timestamp)}</div>
                      <ChevronRight className="size-4 text-text-secondary group-hover:text-white transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Execution Details"
        className="max-w-4xl"
      >
        {selectedLog && (
          <LogDetailContent
            log={selectedLog}
            formatDuration={formatDuration}
            formatBytes={formatBytes}
            formatTimestamp={formatTimestamp}
          />
        )}
      </Modal>
    </>
  )
}
