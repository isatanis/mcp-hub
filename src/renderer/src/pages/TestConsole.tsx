import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Clock, CheckCircle2, XCircle, Copy } from 'lucide-react'
import { useToolStore } from '@/store/toolStore'
import type { TestResult, Tool } from '@shared/types'
import { cn } from '@/lib/utils'

export function TestConsole() {
  const [searchParams] = useSearchParams()
  const { tools, fetchTools } = useToolStore()
  const [selectedToolId, setSelectedToolId] = useState<string>(searchParams.get('toolId') || '')
  const [params, setParams] = useState<Record<string, string>>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ tool: Tool; result: TestResult; timestamp: Date }>>([])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  // Set tool from URL param when tools are loaded
  useEffect(() => {
    const toolIdFromUrl = searchParams.get('toolId')
    if (toolIdFromUrl && tools.length > 0) {
      const toolExists = tools.some(t => t.id === toolIdFromUrl)
      if (toolExists) {
        setSelectedToolId(toolIdFromUrl)
      }
    }
  }, [searchParams, tools])

  const selectedTool = tools.find((t) => t.id === selectedToolId)

  useEffect(() => {
    if (selectedTool) {
      const newParams: Record<string, string> = {}
      selectedTool.parameters.forEach((param) => {
        newParams[param.name] = ''
      })
      setParams(newParams)
    }
  }, [selectedTool])

  const handleTest = async () => {
    if (!selectedTool) return

    setIsLoading(true)
    setResult(null)

    try {
      const convertedParams: Record<string, unknown> = {}
      for (const param of selectedTool.parameters) {
        const value = params[param.name]
        if (param.type === 'number' || param.type === 'integer') {
          convertedParams[param.name] = Number(value)
        } else if (param.type === 'boolean') {
          convertedParams[param.name] = value === 'true'
        } else if (param.type === 'object') {
          convertedParams[param.name] = JSON.parse(value || '{}')
        } else {
          convertedParams[param.name] = value
        }
      }

      const testResult = await window.api.tools.test(selectedToolId, convertedParams)
      setResult(testResult)
      setHistory([{ tool: selectedTool, result: testResult, timestamp: new Date() }, ...history.slice(0, 9)])
    } catch (error) {
      console.error('Test failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      <Header
        title="Test Console"
        description="Test your tools with custom parameters in real-time"
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Tool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedToolId}
                  onChange={(e) => setSelectedToolId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Choose a tool...</option>
                  {tools.filter((t) => t.enabled).map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name}
                    </option>
                  ))}
                </Select>

                {selectedTool && (
                  <div className="p-3 bg-background-dark rounded-lg border border-border-dark">
                    <p className="text-sm text-text-secondary">{selectedTool.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedTool && selectedTool.parameters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTool.parameters.map((param) => (
                    <div key={param.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          {param.name}
                          {param.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <Badge variant="outline" className="text-[10px]">
                          {param.type}
                        </Badge>
                      </div>
                      {param.description && (
                        <p className="text-xs text-text-secondary">{param.description}</p>
                      )}
                      {param.type === 'object' ? (
                        <Textarea
                          value={params[param.name] || ''}
                          onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                          placeholder="{}"
                          rows={3}
                          className="font-mono"
                        />
                      ) : (
                        <Input
                          type={param.type === 'number' || param.type === 'integer' ? 'number' : 'text'}
                          value={params[param.name] || ''}
                          onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                          placeholder={`Enter ${param.name}`}
                        />
                      )}
                    </div>
                  ))}

                  <Button onClick={handleTest} disabled={isLoading} className="w-full">
                    <Play className="size-4" />
                    {isLoading ? 'Testing...' : 'Run Test'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="flex flex-col gap-6">
            {result && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Result</CardTitle>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Clock className="size-4" />
                          {result.duration}ms
                        </div>
                        <Badge
                          variant={result.success ? 'success' : 'danger'}
                          className="flex items-center gap-1"
                        >
                          {result.success ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              Success
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3" />
                              Failed
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Request */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Request</h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(result.request, null, 2))}
                          className="text-text-secondary hover:text-white transition-colors"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                      <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={cn(
                              'text-[10px] font-bold',
                              result.request.method === 'GET'
                                ? 'bg-blue-500/10 text-blue-400'
                                : result.request.method === 'POST'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-orange-500/10 text-orange-400'
                            )}
                          >
                            {result.request.method}
                          </Badge>
                          <span className="text-xs font-mono text-text-secondary truncate">
                            {result.request.url}
                          </span>
                        </div>
                        {result.request.body !== undefined && (
                          <pre className="text-xs font-mono text-text-secondary overflow-x-auto">
                            {JSON.stringify(result.request.body, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    {/* Response */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Response</h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(result.response.body, null, 2))}
                          className="text-text-secondary hover:text-white transition-colors"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                      <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
                        <div className="mb-2">
                          <Badge
                            variant={result.response.status >= 200 && result.response.status < 300 ? 'success' : 'danger'}
                            className="text-[10px]"
                          >
                            {result.response.status}
                          </Badge>
                        </div>
                        <pre className="text-xs font-mono text-white overflow-x-auto max-h-96">
                          {JSON.stringify(result.response.body, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {result.error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <p className="text-sm text-red-400">{result.error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* History */}
            {history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {history.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setResult(item.result)}
                      className="w-full flex items-center justify-between p-3 bg-background-dark hover:bg-surface-dark rounded-lg border border-border-dark transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.tool.name}</p>
                        <p className="text-xs text-text-secondary">
                          {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">{item.result.duration}ms</span>
                        {item.result.success ? (
                          <CheckCircle2 className="size-4 text-green-400" />
                        ) : (
                          <XCircle className="size-4 text-red-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
