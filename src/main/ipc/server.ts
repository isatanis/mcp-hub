import { ipcMain, BrowserWindow } from 'electron'
import { startMcpServer, stopMcpServer, getServerStatus } from '../mcp/server'
import { getDatabase } from '../db'
import type { ServerStatus, LogEntry, ExecutionLog } from '../../shared/types'

let mainWindow: BrowserWindow | null = null
let serverStartTime: Date | null = null

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

function emitStatusChange(status: ServerStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server:statusChange', status)
  }
}

function buildFullStatus(): ServerStatus {
  const baseStatus = getServerStatus()
  const db = getDatabase()
  const config = db.prepare('SELECT * FROM server_config WHERE id = ?').get('default') as {
    transport: string
    port: number | null
  }

  return {
    running: baseStatus.running,
    transport: (config?.transport || 'stdio') as 'stdio' | 'sse',
    port: config?.port || undefined,
    connectedClients: 0, // TODO: Track actual connections
    uptime: baseStatus.running && serverStartTime 
      ? Math.floor((Date.now() - serverStartTime.getTime()) / 1000) 
      : undefined
  }
}

export function registerServerHandlers(): void {
  ipcMain.handle('server:getStatus', async (): Promise<ServerStatus> => {
    return buildFullStatus()
  })

  ipcMain.handle('server:start', async (): Promise<void> => {
    try {
      await startMcpServer()
      serverStartTime = new Date()
      const status = buildFullStatus()
      emitStatusChange(status)
    } catch (error) {
      console.error('Failed to start MCP server:', error)
      throw error
    }
  })

  ipcMain.handle('server:stop', async (): Promise<void> => {
    try {
      await stopMcpServer()
      serverStartTime = null
      const status = buildFullStatus()
      emitStatusChange(status)
    } catch (error) {
      console.error('Failed to stop MCP server:', error)
      throw error
    }
  })

  ipcMain.handle('server:restart', async (): Promise<void> => {
    try {
      await stopMcpServer()
      serverStartTime = null
      
      // Small delay before restart
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      await startMcpServer()
      serverStartTime = new Date()
      const status = buildFullStatus()
      emitStatusChange(status)
    } catch (error) {
      console.error('Failed to restart MCP server:', error)
      throw error
    }
  })

  ipcMain.handle('server:getLogs', async (): Promise<LogEntry[]> => {
    const db = getDatabase()
    const logs = db.prepare(`
      SELECT 
        el.id,
        el.tool_id as toolId,
        el.timestamp,
        el.success,
        el.error,
        t.name as toolName
      FROM execution_logs el
      LEFT JOIN tools t ON el.tool_id = t.id
      ORDER BY el.timestamp DESC
      LIMIT 100
    `).all() as Array<{
      id: string
      toolId: string
      timestamp: string
      success: number
      error: string | null
      toolName: string | null
    }>

    return logs.map(log => ({
      timestamp: new Date(log.timestamp),
      level: log.success ? 'info' : 'error' as const,
      message: log.success
        ? `Tool "${log.toolName || log.toolId}" executed successfully`
        : `Tool "${log.toolName || log.toolId}" failed: ${log.error || 'Unknown error'}`,
      toolId: log.toolId
    }))
  })

  ipcMain.handle('logs:getExecutionLogs', async (_, options?: { limit?: number; offset?: number; toolId?: string; source?: string }): Promise<ExecutionLog[]> => {
    const db = getDatabase()
    const limit = options?.limit || 100
    const offset = options?.offset || 0

    let query = `
      SELECT
        el.id,
        el.tool_id as toolId,
        COALESCE(el.tool_name, t.name, 'Unknown') as toolName,
        COALESCE(el.executor_type, t.executor_type, 'http') as executorType,
        COALESCE(el.source, 'test') as source,
        el.timestamp,
        el.success,
        el.duration_ms as duration,
        COALESCE(el.input_size, 0) as inputSize,
        COALESCE(el.output_size, 0) as outputSize,
        el.request,
        el.response,
        el.error
      FROM execution_logs el
      LEFT JOIN tools t ON el.tool_id = t.id
    `

    const conditions: string[] = []
    const params: unknown[] = []

    if (options?.toolId) {
      conditions.push('el.tool_id = ?')
      params.push(options.toolId)
    }

    if (options?.source) {
      conditions.push('el.source = ?')
      params.push(options.source)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY el.timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const logs = db.prepare(query).all(...params) as Array<{
      id: string
      toolId: string
      toolName: string
      executorType: string
      source: string
      timestamp: string
      success: number
      duration: number
      inputSize: number
      outputSize: number
      request: string
      response: string
      error: string | null
    }>

    return logs.map(log => ({
      id: log.id,
      toolId: log.toolId,
      toolName: log.toolName,
      executorType: log.executorType as ExecutionLog['executorType'],
      source: log.source as ExecutionLog['source'],
      timestamp: new Date(log.timestamp),
      success: Boolean(log.success),
      duration: log.duration,
      inputSize: log.inputSize,
      outputSize: log.outputSize,
      request: JSON.parse(log.request || '{}'),
      response: JSON.parse(log.response || '{}'),
      error: log.error || undefined
    }))
  })

  ipcMain.handle('logs:getStats', async (): Promise<{
    totalExecutions: number
    successCount: number
    failureCount: number
    mcpCount: number
    testCount: number
    avgDuration: number
  }> => {
    const db = getDatabase()
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalExecutions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
        SUM(CASE WHEN source = 'mcp' THEN 1 ELSE 0 END) as mcpCount,
        SUM(CASE WHEN source = 'test' OR source IS NULL THEN 1 ELSE 0 END) as testCount,
        AVG(duration_ms) as avgDuration
      FROM execution_logs
    `).get() as {
      totalExecutions: number
      successCount: number
      failureCount: number
      mcpCount: number
      testCount: number
      avgDuration: number
    }

    return {
      totalExecutions: stats.totalExecutions || 0,
      successCount: stats.successCount || 0,
      failureCount: stats.failureCount || 0,
      mcpCount: stats.mcpCount || 0,
      testCount: stats.testCount || 0,
      avgDuration: Math.round(stats.avgDuration || 0)
    }
  })

  ipcMain.handle('logs:clearLogs', async (): Promise<void> => {
    const db = getDatabase()
    db.prepare('DELETE FROM execution_logs').run()
  })
}
