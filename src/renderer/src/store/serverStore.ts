import { create } from 'zustand'
import type { ServerStatus } from '@shared/types'

interface ServerState {
  status: ServerStatus
  // Actions
  setStatus: (status: ServerStatus) => void
  fetchStatus: () => Promise<void>
  startServer: () => Promise<void>
  stopServer: () => Promise<void>
  restartServer: () => Promise<void>
}

export const useServerStore = create<ServerState>()((set) => ({
  status: {
    running: false,
    transport: 'stdio',
    connectedClients: 0
  },

  setStatus: (status) => set({ status }),

  fetchStatus: async () => {
    const status = await window.api.server.getStatus()
    set({ status })
  },

  startServer: async () => {
    await window.api.server.start()
    const status = await window.api.server.getStatus()
    set({ status })
  },

  stopServer: async () => {
    await window.api.server.stop()
    const status = await window.api.server.getStatus()
    set({ status })
  },

  restartServer: async () => {
    await window.api.server.restart()
    const status = await window.api.server.getStatus()
    set({ status })
  }
}))
