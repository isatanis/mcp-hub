import { ipcMain, BrowserWindow } from 'electron'
import { startMcpServer, stopMcpServer, getServerStatus } from '../mcp/server'
import { getDatabase } from '../db'
import type { ServerStatus, LogEntry } from '../../shared/types'

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
}
