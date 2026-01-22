import { ipcMain } from 'electron'
import { HttpExecutor } from '../mcp/executors/http'
import { CliExecutor } from '../mcp/executors/cli'
import { getDatabase } from '../db'
import { v4 as uuidv4 } from 'uuid'
import type { TestResult, Tool } from '@shared/types'

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

export interface ExecutionLogEntry {
  toolId: string
  toolName: string
  executorType: 'http' | 'cli' | 'script'
  source: 'test' | 'mcp'
  result: TestResult
}

export function saveExecutionLog(entry: ExecutionLogEntry): void {
  const db = getDatabase()
  const id = uuidv4()
  const now = new Date().toISOString()

  // Normalize request/response for both HTTP and CLI results
  const request = entry.result.executorType === 'cli'
    ? entry.result.command
    : entry.result.request
  const response = entry.result.executorType === 'cli'
    ? entry.result.output
    : entry.result.response

  // Calculate sizes
  const requestStr = JSON.stringify(request)
  const responseStr = JSON.stringify(response)
  const inputSize = Buffer.byteLength(requestStr, 'utf8')
  const outputSize = Buffer.byteLength(responseStr, 'utf8')

  db.prepare(`
    INSERT INTO execution_logs (
      id, tool_id, tool_name, executor_type, source, timestamp,
      success, duration_ms, request, response, input_size, output_size, error
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.toolId,
    entry.toolName,
    entry.executorType,
    entry.source,
    now,
    entry.result.success ? 1 : 0,
    entry.result.duration,
    requestStr,
    responseStr,
    inputSize,
    outputSize,
    entry.result.error || null
  )

  // Clean up old logs (keep last 1000)
  db.prepare(`
    DELETE FROM execution_logs
    WHERE id NOT IN (
      SELECT id FROM execution_logs
      ORDER BY timestamp DESC
      LIMIT 1000
    )
  `).run()
}

export function registerTestHandlers(): void {
  const httpExecutor = new HttpExecutor()
  const cliExecutor = new CliExecutor()

  ipcMain.handle('tools:test', async (_, id: string, params: Record<string, unknown>): Promise<TestResult> => {
    const db = getDatabase()
    const dbTool = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as DbTool | undefined

    if (!dbTool) {
      throw new Error('Tool not found')
    }

    const tool = dbToTool(dbTool)

    let result: TestResult

    if (tool.executorType === 'http') {
      result = await httpExecutor.test(tool, params)
    } else if (tool.executorType === 'cli') {
      result = await cliExecutor.test(tool, params)
    } else {
      throw new Error(`Executor type ${tool.executorType} not supported yet`)
    }

    // Save execution log
    saveExecutionLog({
      toolId: id,
      toolName: tool.name,
      executorType: tool.executorType,
      source: 'test',
      result
    })

    return result
  })
}
