import { create } from 'zustand'
import type { Tool } from '@shared/types'

interface ToolState {
  tools: Tool[]
  selectedToolId: string | null
  isLoading: boolean
  error: string | null
  // Actions
  setTools: (tools: Tool[]) => void
  selectTool: (id: string | null) => void
  addTool: (tool: Tool) => void
  updateTool: (id: string, updates: Partial<Tool>) => void
  removeTool: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  // Async actions
  fetchTools: () => Promise<void>
  createTool: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tool>
  saveTool: (id: string, updates: Partial<Tool>) => Promise<Tool>
  deleteTool: (id: string) => Promise<void>
  duplicateTool: (id: string) => Promise<Tool>
}

export const useToolStore = create<ToolState>()((set) => ({
  tools: [],
  selectedToolId: null,
  isLoading: false,
  error: null,

  setTools: (tools) => set({ tools }),
  selectTool: (id) => set({ selectedToolId: id }),
  addTool: (tool) => set((state) => ({ tools: [...state.tools, tool] })),
  updateTool: (id, updates) =>
    set((state) => ({
      tools: state.tools.map((t) => (t.id === id ? { ...t, ...updates } : t))
    })),
  removeTool: (id) => set((state) => ({ tools: state.tools.filter((t) => t.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchTools: async () => {
    set({ isLoading: true, error: null })
    try {
      const tools = await window.api.tools.getAll()
      set({ tools, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch tools', isLoading: false })
    }
  },

  createTool: async (toolData) => {
    set({ isLoading: true, error: null })
    try {
      const tool = await window.api.tools.create(toolData)
      set((state) => ({ tools: [...state.tools, tool], isLoading: false }))
      return tool
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create tool', isLoading: false })
      throw error
    }
  },

  saveTool: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const tool = await window.api.tools.update(id, updates)
      set((state) => ({
        tools: state.tools.map((t) => (t.id === id ? tool : t)),
        isLoading: false
      }))
      return tool
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save tool', isLoading: false })
      throw error
    }
  },

  deleteTool: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.tools.delete(id)
      set((state) => ({
        tools: state.tools.filter((t) => t.id !== id),
        selectedToolId: state.selectedToolId === id ? null : state.selectedToolId,
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete tool', isLoading: false })
      throw error
    }
  },

  duplicateTool: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const tool = await window.api.tools.duplicate(id)
      set((state) => ({ tools: [...state.tools, tool], isLoading: false }))
      return tool
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to duplicate tool', isLoading: false })
      throw error
    }
  }
}))
