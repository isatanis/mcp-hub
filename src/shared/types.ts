// Core data types

export interface Tool {
  id: string
  name: string
  description: string
  enabled: boolean
  executorType: 'http' | 'cli' | 'script'
  executorConfig: HttpConfig | CliConfig | ScriptConfig
  parameters: ToolParameter[]
  auth: AuthConfig
  createdAt: Date
  updatedAt: Date
}

export interface HttpConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers: Record<string, string>
  bodyTemplate: string
  responsePath?: string
  timeout?: number
}

export interface CliConfig {
  command: string // Command template with {param} placeholders, e.g., "ls -la {path}"
  workingDir?: string
  timeout?: number // Default: 30000ms
  shell?: boolean // Run in shell (default: true)
  env?: Record<string, string> // Additional environment variables
}

export interface ScriptConfig {
  runtime: 'python' | 'node' | 'shell'
  scriptPath: string
  args?: string[]
}

export interface ToolParameter {
  name: string
  type: 'string' | 'integer' | 'boolean' | 'number' | 'object'
  description: string
  required: boolean
  default?: unknown
  location: 'query' | 'path' | 'body' | 'header' | 'argument' | 'env'
  // 'argument' - interpolated into CLI command template
  // 'env' - passed as environment variable
}

export interface AuthConfig {
  type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2'
  apiKey?: {
    key: string
    location: 'header' | 'query'
    paramName: string
  }
  bearer?: {
    token: string
  }
  basic?: {
    username: string
    password: string
  }
}

export interface ServerConfig {
  id: string
  name: string
  transport: 'stdio' | 'sse'
  port?: number
  autoStart: boolean
  toolIds: string[]
  createdAt: Date
}

export interface ServerStatus {
  running: boolean
  transport: 'stdio' | 'sse'
  port?: number
  connectedClients: number
  uptime?: number
}

export interface TestResult {
  success: boolean
  duration: number
  executorType: 'http' | 'cli' | 'script'
  // HTTP-specific fields
  request?: {
    method: string
    url: string
    headers: Record<string, string>
    body?: unknown
  }
  response?: {
    status: number
    headers: Record<string, string>
    body: unknown
  }
  // CLI-specific fields
  command?: {
    raw: string
    workingDir?: string
    env?: Record<string, string>
  }
  output?: {
    stdout: string
    stderr: string
    exitCode: number
  }
  error?: string
}

export interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
  toolId?: string
}

export interface ExecutionLog {
  id: string
  toolId: string
  toolName: string
  executorType: 'http' | 'cli' | 'script'
  source: 'test' | 'mcp'
  timestamp: Date
  success: boolean
  duration: number
  inputSize: number
  outputSize: number
  request: unknown
  response: unknown
  error?: string
}
