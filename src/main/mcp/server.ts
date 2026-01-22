import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod'
import { getDatabase } from '../db'
import { HttpExecutor } from './executors/http'
import { CliExecutor } from './executors/cli'
import type { Tool } from '@shared/types'

let serverInstance: McpServer | null = null
let isRunning = false

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

function convertToZodSchema(tool: Tool) {
  const schema: Record<string, z.ZodTypeAny> = {}

  for (const param of tool.parameters) {
    let zodType: z.ZodTypeAny

    switch (param.type) {
      case 'string':
        zodType = z.string().describe(param.description || '')
        break
      case 'number':
      case 'integer':
        zodType = z.number().describe(param.description || '')
        break
      case 'boolean':
        zodType = z.boolean().describe(param.description || '')
        break
      case 'object':
        zodType = z.record(z.string(), z.unknown()).describe(param.description || '')
        break
      default:
        zodType = z.string().describe(param.description || '')
    }

    if (!param.required) {
      zodType = zodType.optional()
    }

    schema[param.name] = zodType
  }

  return schema
}

export async function startMcpServer(): Promise<void> {
  if (isRunning) {
    throw new Error('Server is already running')
  }

  const server = new McpServer({
    name: 'mcp-tool-builder',
    version: '1.0.0'
  })

  // Load all enabled tools from database
  const db = getDatabase()
  const tools = db.prepare('SELECT * FROM tools WHERE enabled = 1').all() as DbTool[]

  const httpExecutor = new HttpExecutor()
  const cliExecutor = new CliExecutor()

  // Register each tool
  for (const dbTool of tools) {
    const tool = dbToTool(dbTool)
    const inputSchema = convertToZodSchema(tool)

    if (tool.executorType === 'http') {
      server.tool(
        tool.name,
        tool.description,
        inputSchema,
        async (params) => {
          try {
            const result = await httpExecutor.execute(tool, params as Record<string, unknown>)
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            return {
              content: [{ type: 'text' as const, text: `Error: ${errorMessage}` }],
              isError: true
            }
          }
        }
      )
    } else if (tool.executorType === 'cli') {
      server.tool(
        tool.name,
        tool.description,
        inputSchema,
        async (params) => {
          try {
            const result = await cliExecutor.execute(tool, params as Record<string, unknown>)
            // Format result - if it's a string, return directly; otherwise JSON stringify
            const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            return {
              content: [{ type: 'text' as const, text }]
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            return {
              content: [{ type: 'text' as const, text: `Error: ${errorMessage}` }],
              isError: true
            }
          }
        }
      )
    }
  }

  // Connect via stdio transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  serverInstance = server
  isRunning = true
}

export async function stopMcpServer(): Promise<void> {
  if (serverInstance) {
    await serverInstance.close()
    serverInstance = null
    isRunning = false
  }
}

export function getServerStatus(): { running: boolean } {
  return { running: isRunning }
}
