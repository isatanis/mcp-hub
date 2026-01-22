import { ipcMain, app } from 'electron'
import { getDatabase } from '../db'
import path from 'path'
import os from 'os'
import type { ServerConfig } from '../../shared/types'

interface DbServerConfig {
  id: string
  name: string
  transport: string
  port: number | null
  auto_start: number
  tool_ids: string
  created_at: string
}

function dbToConfig(dbConfig: DbServerConfig): ServerConfig {
  return {
    id: dbConfig.id,
    name: dbConfig.name,
    transport: dbConfig.transport as ServerConfig['transport'],
    port: dbConfig.port || undefined,
    autoStart: Boolean(dbConfig.auto_start),
    toolIds: JSON.parse(dbConfig.tool_ids),
    createdAt: new Date(dbConfig.created_at)
  }
}

function getExportPathForFormat(format: 'claude' | 'cursor' | 'vscode'): string {
  const homeDir = os.homedir()
  
  switch (format) {
    case 'claude':
      if (process.platform === 'darwin') {
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      } else if (process.platform === 'win32') {
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json')
      } else {
        return path.join(homeDir, '.config', 'claude', 'claude_desktop_config.json')
      }
    case 'cursor':
      return path.join(homeDir, '.cursor', 'mcp.json')
    case 'vscode':
      return path.join(homeDir, '.vscode', 'mcp.json')
    default:
      return ''
  }
}

function generateExportConfig(format: 'claude' | 'cursor' | 'vscode', serverName: string): string {
  // Get the app executable path for production, or the dev server for development
  const appPath = app.isPackaged 
    ? process.execPath 
    : path.join(app.getAppPath(), 'node_modules', '.bin', 'electron')
  
  const serverConfig = {
    command: appPath,
    args: app.isPackaged 
      ? ['--mcp-server'] 
      : [app.getAppPath(), '--mcp-server']
  }

  switch (format) {
    case 'claude':
      return JSON.stringify({
        mcpServers: {
          [serverName]: serverConfig
        }
      }, null, 2)
    
    case 'cursor':
      return JSON.stringify({
        mcpServers: {
          [serverName]: {
            ...serverConfig,
            enabled: true
          }
        }
      }, null, 2)
    
    case 'vscode':
      return JSON.stringify({
        "mcp.servers": {
          [serverName]: serverConfig
        }
      }, null, 2)
    
    default:
      return JSON.stringify({ mcpServers: { [serverName]: serverConfig } }, null, 2)
  }
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', async () => {
    const db = getDatabase()
    const config = db.prepare('SELECT * FROM server_config WHERE id = ?').get('default') as
      | DbServerConfig
      | undefined

    if (!config) {
      throw new Error('Server config not found')
    }

    return dbToConfig(config)
  })

  ipcMain.handle('config:update', async (_, updates: Partial<ServerConfig>) => {
    const db = getDatabase()
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.transport !== undefined) {
      fields.push('transport = ?')
      values.push(updates.transport)
    }
    if (updates.port !== undefined) {
      fields.push('port = ?')
      values.push(updates.port || null)
    }
    if (updates.autoStart !== undefined) {
      fields.push('auto_start = ?')
      values.push(updates.autoStart ? 1 : 0)
    }
    if (updates.toolIds !== undefined) {
      fields.push('tool_ids = ?')
      values.push(JSON.stringify(updates.toolIds))
    }

    if (fields.length === 0) {
      const config = db.prepare('SELECT * FROM server_config WHERE id = ?').get('default') as DbServerConfig
      return dbToConfig(config)
    }

    values.push('default')

    const sql = `UPDATE server_config SET ${fields.join(', ')} WHERE id = ?`
    db.prepare(sql).run(...values)

    const updated = db.prepare('SELECT * FROM server_config WHERE id = ?').get('default') as DbServerConfig
    return dbToConfig(updated)
  })

  ipcMain.handle('config:export', async (_, format: 'claude' | 'cursor' | 'vscode') => {
    const db = getDatabase()
    const config = db.prepare('SELECT * FROM server_config WHERE id = ?').get('default') as DbServerConfig

    return generateExportConfig(format, config.name)
  })

  ipcMain.handle('config:getExportPath', async (_, format?: 'claude' | 'cursor' | 'vscode') => {
    return getExportPathForFormat(format || 'claude')
  })
}
