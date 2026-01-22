import { ipcMain } from 'electron'
import { getDatabase } from '../db'
import { v4 as uuidv4 } from 'uuid'
import type { Tool } from '../../shared/types'

interface DbTool {
  id: string
  name: string
  description: string
  enabled: number
  executor_type: string
  executor_config: string
  parameters: string
  auth: string
  created_at: string
  updated_at: string
}

function dbToTool(dbTool: DbTool): Tool {
  return {
    id: dbTool.id,
    name: dbTool.name,
    description: dbTool.description,
    enabled: Boolean(dbTool.enabled),
    executorType: dbTool.executor_type as Tool['executorType'],
    executorConfig: JSON.parse(dbTool.executor_config),
    parameters: JSON.parse(dbTool.parameters),
    auth: JSON.parse(dbTool.auth),
    createdAt: new Date(dbTool.created_at),
    updatedAt: new Date(dbTool.updated_at)
  }
}

function toolToDb(tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>): Omit<DbTool, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: tool.name,
    description: tool.description,
    enabled: tool.enabled ? 1 : 0,
    executor_type: tool.executorType,
    executor_config: JSON.stringify(tool.executorConfig),
    parameters: JSON.stringify(tool.parameters),
    auth: JSON.stringify(tool.auth)
  }
}

export function registerToolHandlers(): void {
  ipcMain.handle('tools:getAll', async () => {
    const db = getDatabase()
    const tools = db.prepare('SELECT * FROM tools ORDER BY updated_at DESC').all() as DbTool[]
    return tools.map(dbToTool)
  })

  ipcMain.handle('tools:getById', async (_, id: string) => {
    const db = getDatabase()
    const tool = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as DbTool | undefined
    return tool ? dbToTool(tool) : null
  })

  ipcMain.handle('tools:create', async (_, toolData: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const dbData = toolToDb(toolData)

    db.prepare(
      `INSERT INTO tools (id, name, description, enabled, executor_type, executor_config, parameters, auth, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      dbData.name,
      dbData.description,
      dbData.enabled,
      dbData.executor_type,
      dbData.executor_config,
      dbData.parameters,
      dbData.auth,
      now,
      now
    )

    const created = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as DbTool
    return dbToTool(created)
  })

  ipcMain.handle('tools:update', async (_, id: string, updates: Partial<Tool>) => {
    const db = getDatabase()
    const now = new Date().toISOString()
    
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(updates.enabled ? 1 : 0)
    }
    if (updates.executorType !== undefined) {
      fields.push('executor_type = ?')
      values.push(updates.executorType)
    }
    if (updates.executorConfig !== undefined) {
      fields.push('executor_config = ?')
      values.push(JSON.stringify(updates.executorConfig))
    }
    if (updates.parameters !== undefined) {
      fields.push('parameters = ?')
      values.push(JSON.stringify(updates.parameters))
    }
    if (updates.auth !== undefined) {
      fields.push('auth = ?')
      values.push(JSON.stringify(updates.auth))
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const sql = `UPDATE tools SET ${fields.join(', ')} WHERE id = ?`
    db.prepare(sql).run(...values)

    const updated = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as DbTool
    return dbToTool(updated)
  })

  ipcMain.handle('tools:delete', async (_, id: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM tools WHERE id = ?').run(id)
  })

  ipcMain.handle('tools:duplicate', async (_, id: string) => {
    const db = getDatabase()
    const original = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as DbTool | undefined
    
    if (!original) {
      throw new Error('Tool not found')
    }

    const newId = uuidv4()
    const now = new Date().toISOString()
    const newName = `${original.name}_copy`

    db.prepare(
      `INSERT INTO tools (id, name, description, enabled, executor_type, executor_config, parameters, auth, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId,
      newName,
      original.description,
      original.enabled,
      original.executor_type,
      original.executor_config,
      original.parameters,
      original.auth,
      now,
      now
    )

    const duplicated = db.prepare('SELECT * FROM tools WHERE id = ?').get(newId) as DbTool
    return dbToTool(duplicated)
  })
}
