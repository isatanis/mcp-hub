/// <reference types="vite/client" />

import type { ElectronAPI } from '@electron-toolkit/preload'
import type { Tool, ServerConfig, ServerStatus, TestResult, LogEntry } from '../../shared/types'

interface API {
  tools: {
    getAll: () => Promise<Tool[]>
    getById: (id: string) => Promise<Tool | null>
    create: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tool>
    update: (id: string, tool: Partial<Tool>) => Promise<Tool>
    delete: (id: string) => Promise<void>
    duplicate: (id: string) => Promise<Tool>
    test: (id: string, params: Record<string, unknown>) => Promise<TestResult>
  }
  server: {
    getStatus: () => Promise<ServerStatus>
    start: () => Promise<void>
    stop: () => Promise<void>
    restart: () => Promise<void>
    getLogs: () => Promise<LogEntry[]>
    onStatusChange: (callback: (status: ServerStatus) => void) => void
  }
  config: {
    get: () => Promise<ServerConfig>
    update: (config: Partial<ServerConfig>) => Promise<ServerConfig>
    export: (format: 'claude' | 'cursor' | 'vscode') => Promise<string>
    getExportPath: (format?: 'claude' | 'cursor' | 'vscode') => Promise<string>
  }
  secrets: {
    store: (key: string, value: string) => Promise<void>
    retrieve: (key: string) => Promise<string | null>
    delete: (key: string) => Promise<void>
    list: () => Promise<string[]>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}

export {}
