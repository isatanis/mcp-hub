import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Play, ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { useToolStore } from '@/store/toolStore'
import { useToast } from '@/components/ui/toast'
import type { Tool, HttpConfig, CliConfig, ToolParameter } from '@shared/types'

export function ToolEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tools, createTool, saveTool } = useToolStore()
  const { toast } = useToast()
  const isNew = !id

  const [tool, setTool] = useState<Partial<Tool>>({
    name: '',
    description: '',
    enabled: true,
    executorType: 'http',
    executorConfig: {
      method: 'GET',
      url: '',
      headers: {},
      bodyTemplate: '',
      timeout: 5000
    } as HttpConfig,
    parameters: [],
    auth: { type: 'none' }
  })

  const [isSaving, setIsSaving] = useState(false)
  const originalToolRef = useRef<string>('')

  useEffect(() => {
    if (!isNew && id) {
      const existingTool = tools.find((t) => t.id === id)
      if (existingTool) {
        setTool(existingTool)
        originalToolRef.current = JSON.stringify(existingTool)
      }
    } else {
      originalToolRef.current = JSON.stringify(tool)
    }
  }, [id, isNew, tools])

  const hasChanges = JSON.stringify(tool) !== originalToolRef.current

  const httpConfig = tool.executorConfig as HttpConfig
  const cliConfig = tool.executorConfig as CliConfig

  const handleExecutorTypeChange = (newType: Tool['executorType']) => {
    if (newType === 'http') {
      setTool({
        ...tool,
        executorType: 'http',
        executorConfig: {
          method: 'GET',
          url: '',
          headers: {},
          bodyTemplate: '',
          timeout: 5000
        } as HttpConfig,
        parameters: tool.parameters?.map(p => ({
          ...p,
          location: p.location === 'argument' || p.location === 'env' ? 'query' : p.location
        })) || []
      })
    } else if (newType === 'cli') {
      setTool({
        ...tool,
        executorType: 'cli',
        executorConfig: {
          command: '',
          workingDir: '',
          timeout: 30000,
          shell: true
        } as CliConfig,
        auth: { type: 'none' },
        parameters: tool.parameters?.map(p => ({
          ...p,
          location: 'argument'
        })) || []
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      let newTool: Tool | undefined
      if (isNew) {
        newTool = await createTool(tool as Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>)
      } else if (id) {
        await saveTool(id, tool)
      }
      const toolId = newTool?.id ?? id
      toast(isNew ? 'Tool created successfully' : 'Tool saved successfully', 'success')
      originalToolRef.current = JSON.stringify(tool)
      navigate(`/tools/${toolId}`)
    } catch (error) {
      console.error('Failed to save tool:', error)
      toast('Failed to save tool', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = () => {
    if (id) {
      navigate(`/test-console?toolId=${id}`)
    } else {
      // For new tools, save first then redirect
      handleSave().then(() => {
        if (tool.name) {
          navigate('/test-console')
        }
      })
    }
  }

  const addParameter = () => {
    const defaultLocation = tool.executorType === 'cli' ? 'argument' : 'query'
    setTool({
      ...tool,
      parameters: [
        ...(tool.parameters || []),
        {
          name: '',
          type: 'string',
          description: '',
          required: false,
          location: defaultLocation
        }
      ]
    })
  }

  const updateParameter = (index: number, updates: Partial<ToolParameter>) => {
    const newParams = [...(tool.parameters || [])]
    newParams[index] = { ...newParams[index], ...updates }
    setTool({ ...tool, parameters: newParams })
  }

  const removeParameter = (index: number) => {
    setTool({
      ...tool,
      parameters: tool.parameters?.filter((_, i) => i !== index) || []
    })
  }

  const addHeader = () => {
    const headers = httpConfig.headers || {}
    headers[''] = ''
    setTool({
      ...tool,
      executorConfig: { ...httpConfig, headers }
    })
  }

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...httpConfig.headers }
    if (oldKey !== newKey) {
      delete headers[oldKey]
    }
    headers[newKey] = value
    setTool({
      ...tool,
      executorConfig: { ...httpConfig, headers }
    })
  }

  const removeHeader = (key: string) => {
    const headers = { ...httpConfig.headers }
    delete headers[key]
    setTool({
      ...tool,
      executorConfig: { ...httpConfig, headers }
    })
  }

  return (
    <>
      <Header
        title={isNew ? 'Create New Tool' : 'Edit Tool'}
        description="Configure your MCP tool definition"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/tools')}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button variant="secondary" onClick={handleTest} disabled={isNew && !tool.name}>
              <Play className="size-4" />
              Test
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tool Name*</label>
                <Input
                  value={tool.name}
                  onChange={(e) => setTool({ ...tool, name: e.target.value })}
                  placeholder="get_weather"
                  className="font-mono"
                />
                <p className="text-xs text-text-secondary">Use snake_case for tool names</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description*</label>
                <Textarea
                  value={tool.description}
                  onChange={(e) => setTool({ ...tool, description: e.target.value })}
                  placeholder="Fetches current weather for a given city"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enabled</label>
                  <p className="text-xs text-text-secondary">Tool will be available in MCP server</p>
                </div>
                <Switch
                  checked={tool.enabled}
                  onChange={(e) => setTool({ ...tool, enabled: e.target.checked })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Executor Type</label>
                <Select
                  value={tool.executorType || 'http'}
                  onChange={(e) => handleExecutorTypeChange(e.target.value as Tool['executorType'])}
                >
                  <option value="http">HTTP Request</option>
                  <option value="cli">CLI / Bash Command</option>
                </Select>
                <p className="text-xs text-text-secondary">
                  {tool.executorType === 'cli'
                    ? 'Execute shell commands or CLI programs'
                    : 'Make HTTP/REST API calls'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Executor Config */}
          <Card>
            <CardHeader>
              <CardTitle>
                {tool.executorType === 'cli' ? 'CLI Configuration' : 'HTTP Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tool.executorType === 'cli' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Command*</label>
                    <Textarea
                      value={cliConfig.command || ''}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...cliConfig, command: e.target.value }
                        })
                      }
                      placeholder="ls -la {path}"
                      rows={3}
                      className="font-mono"
                    />
                    <p className="text-xs text-text-secondary">
                      Use {'{param}'} for parameter placeholders. Example: curl -s {'{url}'} | jq {'{filter}'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Working Directory</label>
                    <Input
                      value={cliConfig.workingDir || ''}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...cliConfig, workingDir: e.target.value }
                        })
                      }
                      placeholder="/path/to/directory (optional)"
                      className="font-mono"
                    />
                    <p className="text-xs text-text-secondary">Directory to run the command in (defaults to current directory)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timeout (ms)</label>
                    <Input
                      type="number"
                      value={cliConfig.timeout || 30000}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...cliConfig, timeout: parseInt(e.target.value) || 30000 }
                        })
                      }
                      placeholder="30000"
                    />
                    <p className="text-xs text-text-secondary">Command timeout in milliseconds (default: 30000)</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Run in Shell</label>
                      <p className="text-xs text-text-secondary">Execute command through /bin/sh (enables pipes, redirects, etc.)</p>
                    </div>
                    <Switch
                      checked={cliConfig.shell !== false}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...cliConfig, shell: e.target.checked }
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Method</label>
                    <Select
                      value={httpConfig.method}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...httpConfig, method: e.target.value as HttpConfig['method'] }
                        })
                      }
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL Endpoint</label>
                    <Input
                      value={httpConfig.url}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...httpConfig, url: e.target.value }
                        })
                      }
                      placeholder="https://api.example.com/weather?city={city}"
                      className="font-mono"
                    />
                    <p className="text-xs text-text-secondary">Use {'{param}'} for parameter placeholders</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Headers</label>
                      <Button variant="ghost" size="sm" onClick={addHeader}>
                        <Plus className="size-4" />
                        Add Header
                      </Button>
                    </div>
                    {Object.entries(httpConfig.headers || {}).map(([key, value], index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={key}
                          onChange={(e) => updateHeader(key, e.target.value, value)}
                          placeholder="Header Name"
                          className="flex-1 font-mono"
                        />
                        <Input
                          value={value}
                          onChange={(e) => updateHeader(key, key, e.target.value)}
                          placeholder="Header Value"
                          className="flex-1 font-mono"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeHeader(key)}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {(httpConfig.method === 'POST' || httpConfig.method === 'PUT') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Body Template (JSON)</label>
                      <Textarea
                        value={httpConfig.bodyTemplate}
                        onChange={(e) =>
                          setTool({
                            ...tool,
                            executorConfig: { ...httpConfig, bodyTemplate: e.target.value }
                          })
                        }
                        placeholder={'{\n  "city": "{city}",\n  "units": "metric"\n}'}
                        rows={5}
                        className="font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Response Path (JSONPath)</label>
                    <Input
                      value={httpConfig.responsePath || ''}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...httpConfig, responsePath: e.target.value }
                        })
                      }
                      placeholder="$.data.temperature"
                      className="font-mono"
                    />
                    <p className="text-xs text-text-secondary">Extract a specific field from the response (e.g., $.data.result)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timeout (ms)</label>
                    <Input
                      type="number"
                      value={httpConfig.timeout || 5000}
                      onChange={(e) =>
                        setTool({
                          ...tool,
                          executorConfig: { ...httpConfig, timeout: parseInt(e.target.value) || 5000 }
                        })
                      }
                      placeholder="5000"
                    />
                    <p className="text-xs text-text-secondary">Request timeout in milliseconds (default: 5000)</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Parameters</CardTitle>
                <Button variant="ghost" size="sm" onClick={addParameter}>
                  <Plus className="size-4" />
                  Add Parameter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(tool.parameters || []).length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">
                  No parameters yet. Add a parameter to get started.
                </p>
              ) : (
                (tool.parameters || []).map((param, index) => (
                  <Card key={index} className="bg-background-dark">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          <div className="space-y-2">
                            <label className="text-xs font-medium">Name*</label>
                            <Input
                              value={param.name}
                              onChange={(e) => updateParameter(index, { name: e.target.value })}
                              placeholder="city"
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium">Type</label>
                            <Select
                              value={param.type}
                              onChange={(e) =>
                                updateParameter(index, { type: e.target.value as ToolParameter['type'] })
                              }
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="integer">Integer</option>
                              <option value="boolean">Boolean</option>
                              <option value="object">Object</option>
                            </Select>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeParameter(index)}>
                          <X className="size-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium">Description</label>
                        <Input
                          value={param.description}
                          onChange={(e) => updateParameter(index, { description: e.target.value })}
                          placeholder="City name to get weather for"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Location</label>
                          <Select
                            value={param.location}
                            onChange={(e) =>
                              updateParameter(index, { location: e.target.value as ToolParameter['location'] })
                            }
                          >
                            {tool.executorType === 'cli' ? (
                              <>
                                <option value="argument">Argument (in command)</option>
                                <option value="env">Environment Variable</option>
                              </>
                            ) : (
                              <>
                                <option value="query">Query</option>
                                <option value="path">Path</option>
                                <option value="body">Body</option>
                                <option value="header">Header</option>
                              </>
                            )}
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={param.required}
                              onChange={(e) => updateParameter(index, { required: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-xs font-medium">Required</span>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Authentication - only for HTTP tools */}
          {tool.executorType !== 'cli' && (
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Auth Type</label>
                <Select
                  value={tool.auth?.type || 'none'}
                  onChange={(e) => {
                    const authType = e.target.value as Tool['auth']['type']
                    if (authType === 'none') {
                      setTool({ ...tool, auth: { type: 'none' } })
                    } else if (authType === 'api_key') {
                      setTool({
                        ...tool,
                        auth: {
                          type: 'api_key',
                          apiKey: { key: '', location: 'header', paramName: 'X-API-Key' }
                        }
                      })
                    } else if (authType === 'bearer') {
                      setTool({
                        ...tool,
                        auth: { type: 'bearer', bearer: { token: '' } }
                      })
                    } else if (authType === 'basic') {
                      setTool({
                        ...tool,
                        auth: { type: 'basic', basic: { username: '', password: '' } }
                      })
                    }
                  }}
                >
                  <option value="none">None</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                </Select>
              </div>

              {tool.auth?.type === 'api_key' && tool.auth.apiKey && (
                <Card className="bg-background-dark">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Secret Key Name</label>
                      <Input
                        value={tool.auth.apiKey.key}
                        onChange={(e) =>
                          setTool({
                            ...tool,
                            auth: {
                              ...tool.auth,
                              apiKey: { ...tool.auth.apiKey!, key: e.target.value }
                            }
                          })
                        }
                        placeholder="OPENAI_API_KEY"
                        className="font-mono"
                      />
                      <p className="text-xs text-text-secondary">Reference a secret stored in Settings, or enter the key directly</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Location</label>
                        <Select
                          value={tool.auth.apiKey.location}
                          onChange={(e) =>
                            setTool({
                              ...tool,
                              auth: {
                                ...tool.auth,
                                apiKey: { ...tool.auth.apiKey!, location: e.target.value as 'header' | 'query' }
                              }
                            })
                          }
                        >
                          <option value="header">Header</option>
                          <option value="query">Query Parameter</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Parameter Name</label>
                        <Input
                          value={tool.auth.apiKey.paramName}
                          onChange={(e) =>
                            setTool({
                              ...tool,
                              auth: {
                                ...tool.auth,
                                apiKey: { ...tool.auth.apiKey!, paramName: e.target.value }
                              }
                            })
                          }
                          placeholder="X-API-Key"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tool.auth?.type === 'bearer' && tool.auth.bearer && (
                <Card className="bg-background-dark">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Token Secret Name</label>
                      <Input
                        value={tool.auth.bearer.token}
                        onChange={(e) =>
                          setTool({
                            ...tool,
                            auth: {
                              ...tool.auth,
                              bearer: { token: e.target.value }
                            }
                          })
                        }
                        placeholder="MY_BEARER_TOKEN"
                        className="font-mono"
                      />
                      <p className="text-xs text-text-secondary">Reference a secret stored in Settings, or enter the token directly</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tool.auth?.type === 'basic' && tool.auth.basic && (
                <Card className="bg-background-dark">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Username</label>
                        <Input
                          value={tool.auth.basic.username}
                          onChange={(e) =>
                            setTool({
                              ...tool,
                              auth: {
                                ...tool.auth,
                                basic: { ...tool.auth.basic!, username: e.target.value }
                              }
                            })
                          }
                          placeholder="username or SECRET_NAME"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Password</label>
                        <Input
                          type="password"
                          value={tool.auth.basic.password}
                          onChange={(e) =>
                            setTool({
                              ...tool,
                              auth: {
                                ...tool.auth,
                                basic: { ...tool.auth.basic!, password: e.target.value }
                              }
                            })
                          }
                          placeholder="password or SECRET_NAME"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary">You can reference secrets stored in Settings by using their key names</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </>
  )
}
