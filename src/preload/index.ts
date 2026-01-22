import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Tool, ServerConfig, TestResult } from '../shared/types'

// Custom APIs for renderer
const api = {
  tools: {
    getAll: (): Promise<Tool[]> => ipcRenderer.invoke('tools:getAll'),
    getById: (id: string): Promise<Tool | null> => ipcRenderer.invoke('tools:getById', id),
    create: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tool> =>
      ipcRenderer.invoke('tools:create', tool),
    update: (id: string, tool: Partial<Tool>): Promise<Tool> =>
      ipcRenderer.invoke('tools:update', id, tool),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tools:delete', id),
    duplicate: (id: string): Promise<Tool> => ipcRenderer.invoke('tools:duplicate', id),
    test: (id: string, params: Record<string, unknown>): Promise<TestResult> =>
      ipcRenderer.invoke('tools:test', id, params)
  },
  config: {
    get: (): Promise<ServerConfig> => ipcRenderer.invoke('config:get'),
    update: (config: Partial<ServerConfig>): Promise<ServerConfig> =>
      ipcRenderer.invoke('config:update', config),
    export: (format: 'claude' | 'cursor' | 'vscode'): Promise<string> =>
      ipcRenderer.invoke('config:export', format),
    getExportPath: (format?: 'claude' | 'cursor' | 'vscode'): Promise<string> => 
      ipcRenderer.invoke('config:getExportPath', format)
  },
  secrets: {
    store: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('secrets:store', key, value),
    retrieve: (key: string): Promise<string | null> => ipcRenderer.invoke('secrets:retrieve', key),
    delete: (key: string): Promise<void> => ipcRenderer.invoke('secrets:delete', key),
    list: (): Promise<string[]> => ipcRenderer.invoke('secrets:list')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
