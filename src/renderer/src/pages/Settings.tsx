import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Save, Download, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react'
import type { ServerConfig } from '@shared/types'

interface SecretEntry {
  key: string
  value: string
  isNew?: boolean
}

export function Settings() {
  const [config, setConfig] = useState<ServerConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [exportFormat, setExportFormat] = useState<'claude' | 'cursor' | 'vscode'>('claude')
  const [exportPath, setExportPath] = useState<string>('')
  
  // Secrets state
  const [secretKeys, setSecretKeys] = useState<string[]>([])
  const [secretValues, setSecretValues] = useState<Record<string, string>>({})
  const [newSecret, setNewSecret] = useState<SecretEntry | null>(null)
  const [editingSecret, setEditingSecret] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [secretsLoading, setSecretsLoading] = useState(false)

  useEffect(() => {
    loadConfig()
    loadSecrets()
  }, [])

  useEffect(() => {
    updateExportPath()
  }, [exportFormat])

  const loadConfig = async () => {
    const serverConfig = await window.api.config.get()
    setConfig(serverConfig)
  }

  const loadSecrets = async () => {
    setSecretsLoading(true)
    try {
      const keys = await window.api.secrets.list()
      setSecretKeys(keys)
      
      // Load values for display (masked)
      const values: Record<string, string> = {}
      for (const key of keys) {
        const value = await window.api.secrets.retrieve(key)
        if (value) {
          values[key] = value
        }
      }
      setSecretValues(values)
    } finally {
      setSecretsLoading(false)
    }
  }

  const updateExportPath = async () => {
    const path = await window.api.config.getExportPath(exportFormat)
    setExportPath(path)
  }

  const handleSave = async () => {
    if (!config) return
    setIsLoading(true)
    try {
      await window.api.config.update(config)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const exportData = await window.api.config.export(exportFormat)
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mcp-config-${exportFormat}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleAddSecret = async () => {
    if (!newSecret || !newSecret.key || !newSecret.value) return
    
    try {
      await window.api.secrets.store(newSecret.key, newSecret.value)
      setNewSecret(null)
      await loadSecrets()
    } catch (error) {
      console.error('Failed to add secret:', error)
    }
  }

  const handleDeleteSecret = async (key: string) => {
    try {
      await window.api.secrets.delete(key)
      await loadSecrets()
    } catch (error) {
      console.error('Failed to delete secret:', error)
    }
  }

  const handleEditSecret = async (key: string) => {
    if (!editValue) return
    
    try {
      await window.api.secrets.store(key, editValue)
      setEditingSecret(null)
      setEditValue('')
      await loadSecrets()
    } catch (error) {
      console.error('Failed to update secret:', error)
    }
  }

  const startEditing = (key: string) => {
    setEditingSecret(key)
    setEditValue(secretValues[key] || '')
  }

  const maskValue = (value: string) => {
    if (value.length <= 4) return '••••••••'
    return '••••••••' + value.slice(-4)
  }

  if (!config) {
    return (
      <>
        <Header title="Settings" description="Configure server and application settings" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary">Loading settings...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Settings"
        description="Configure server and application settings"
        actions={
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="size-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {/* Server Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>Configure your MCP server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Server Name</label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="My MCP Server"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Transport</label>
                <Select
                  value={config.transport}
                  onChange={(e) => setConfig({ ...config, transport: e.target.value as ServerConfig['transport'] })}
                >
                  <option value="stdio">STDIO</option>
                  <option value="sse">SSE (Server-Sent Events)</option>
                </Select>
                <p className="text-xs text-text-secondary">
                  STDIO is recommended for desktop apps like Claude Desktop
                </p>
              </div>

              {config.transport === 'sse' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    type="number"
                    value={config.port || 3000}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                    placeholder="3000"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="text-sm font-medium">Auto-start Server</label>
                  <p className="text-xs text-text-secondary">Start server automatically on app launch</p>
                </div>
                <Switch
                  checked={config.autoStart}
                  onChange={(e) => setConfig({ ...config, autoStart: e.target.checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Export Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Export Configuration</CardTitle>
              <CardDescription>Export your MCP server config for integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                >
                  <option value="claude">Claude Desktop</option>
                  <option value="cursor">Cursor IDE</option>
                  <option value="vscode">VS Code</option>
                </Select>
              </div>

              <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
                <p className="text-xs text-text-secondary mb-2">Configuration will be saved to:</p>
                <code className="text-xs font-mono text-white break-all">
                  {exportPath}
                </code>
              </div>

              <Button onClick={handleExport} variant="secondary" className="w-full">
                <Download className="size-4" />
                Download {exportFormat === 'claude' ? 'Claude' : exportFormat === 'cursor' ? 'Cursor' : 'VS Code'}{' '}
                Config
              </Button>
            </CardContent>
          </Card>

          {/* Secrets Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Secrets & Credentials</CardTitle>
                  <CardDescription>Manage API keys and authentication tokens</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="text-text-secondary hover:text-white transition-colors p-2"
                    title={showSecrets ? 'Hide secrets' : 'Show secrets'}
                  >
                    {showSecrets ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setNewSecret({ key: '', value: '' })}
                    disabled={newSecret !== null}
                  >
                    <Plus className="size-4" />
                    Add Secret
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* New Secret Form */}
              {newSecret && (
                <div className="p-4 bg-background-dark rounded-lg border border-primary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">New Secret</span>
                    <button 
                      onClick={() => setNewSecret(null)}
                      className="text-text-secondary hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Key (e.g., OPENAI_API_KEY)"
                      value={newSecret.key}
                      onChange={(e) => setNewSecret({ ...newSecret, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                      className="font-mono"
                    />
                    <Input
                      type={showSecrets ? 'text' : 'password'}
                      placeholder="Value"
                      value={newSecret.value}
                      onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleAddSecret}
                    disabled={!newSecret.key || !newSecret.value}
                  >
                    Save Secret
                  </Button>
                </div>
              )}

              {/* Secrets List */}
              {secretsLoading ? (
                <p className="text-sm text-text-secondary text-center py-4">Loading secrets...</p>
              ) : secretKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-text-secondary mb-2">No secrets stored yet.</p>
                  <p className="text-xs text-text-secondary">
                    Add API keys and tokens that your tools can reference.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {secretKeys.map((key) => (
                    <div 
                      key={key} 
                      className="flex items-center justify-between p-3 bg-background-dark rounded-lg border border-border-dark"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-mono text-white">{key}</span>
                        {editingSecret === key ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type={showSecrets ? 'text' : 'password'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 text-sm"
                            />
                            <Button size="sm" onClick={() => handleEditSecret(key)}>
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                setEditingSecret(null)
                                setEditValue('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary font-mono">
                            {showSecrets ? secretValues[key] : maskValue(secretValues[key] || '')}
                          </span>
                        )}
                      </div>
                      {editingSecret !== key && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startEditing(key)}
                          >
                            Edit
                          </Button>
                          <button
                            onClick={() => handleDeleteSecret(key)}
                            className="text-text-secondary hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-300">
                  <strong>Tip:</strong> Secrets are stored securely using Electron's safeStorage. 
                  Reference them in your tool configurations by using the key name (e.g., <code className="bg-blue-500/20 px-1 rounded">OPENAI_API_KEY</code>).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Application Info */}
          <Card>
            <CardHeader>
              <CardTitle>Application Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Version</span>
                <span className="text-white font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">MCP SDK Version</span>
                <span className="text-white font-medium">Latest</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Database Location</span>
                <span className="text-white font-medium font-mono text-xs">
                  ~/Library/Application Support/mcp-tool-builder/
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
