import type { Tool, HttpConfig, TestResult } from '@shared/types'
import { getSecretValue } from '../../ipc/secrets'

export class HttpExecutor {
  private interpolateUrl(url: string, params: Record<string, unknown>, toolParams: Tool['parameters']): string {
    let result = url
    
    // Replace path parameters with URL encoding
    for (const param of toolParams) {
      if (param.location === 'path' && params[param.name] !== undefined) {
        result = result.replace(`{${param.name}}`, encodeURIComponent(String(params[param.name])))
      }
    }
    
    // Also replace any remaining {param} placeholders
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`{${key}}`, encodeURIComponent(String(value)))
    }
    
    return result
  }

  private buildQueryString(params: Record<string, unknown>, toolParams: Tool['parameters']): string {
    const queryParams = new URLSearchParams()
    
    for (const param of toolParams) {
      if (param.location === 'query' && params[param.name] !== undefined) {
        queryParams.append(param.name, String(params[param.name]))
      }
    }
    
    return queryParams.toString()
  }

  private async applyAuth(auth: Tool['auth'], headers: Record<string, string>, url: string): Promise<string> {
    let resultUrl = url
    
    if (auth.type === 'api_key' && auth.apiKey) {
      // Try to get the actual secret value if the key looks like a reference
      let apiKeyValue = auth.apiKey.key
      const secretValue = getSecretValue(auth.apiKey.key)
      if (secretValue) {
        apiKeyValue = secretValue
      }
      
      if (auth.apiKey.location === 'header') {
        headers[auth.apiKey.paramName] = apiKeyValue
      } else if (auth.apiKey.location === 'query') {
        const separator = resultUrl.includes('?') ? '&' : '?'
        resultUrl += `${separator}${encodeURIComponent(auth.apiKey.paramName)}=${encodeURIComponent(apiKeyValue)}`
      }
    } else if (auth.type === 'bearer' && auth.bearer) {
      let tokenValue = auth.bearer.token
      const secretValue = getSecretValue(auth.bearer.token)
      if (secretValue) {
        tokenValue = secretValue
      }
      headers['Authorization'] = `Bearer ${tokenValue}`
    } else if (auth.type === 'basic' && auth.basic) {
      let username = auth.basic.username
      let password = auth.basic.password
      
      // Try to get secrets
      const usernameSecret = getSecretValue(auth.basic.username)
      const passwordSecret = getSecretValue(auth.basic.password)
      if (usernameSecret) username = usernameSecret
      if (passwordSecret) password = passwordSecret
      
      const credentials = Buffer.from(`${username}:${password}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }
    
    return resultUrl
  }

  private interpolateBodyTemplate(template: string, params: Record<string, unknown>): string {
    let result = template
    
    for (const [key, value] of Object.entries(params)) {
      // Handle different value types appropriately
      const replacement = typeof value === 'string' ? value : JSON.stringify(value)
      // Replace {key} with the value (for string interpolation in JSON)
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), replacement)
    }
    
    return result
  }

  async execute(tool: Tool, params: Record<string, unknown>): Promise<unknown> {
    const config = tool.executorConfig as HttpConfig

    // Interpolate URL with path parameters
    let url = this.interpolateUrl(config.url, params, tool.parameters)

    // Build query string for query parameters
    const queryString = this.buildQueryString(params, tool.parameters)
    if (queryString) {
      const separator = url.includes('?') ? '&' : '?'
      url += separator + queryString
    }

    // Build headers
    const headers: Record<string, string> = { ...config.headers }

    // Apply authentication (may modify URL for query-based API keys)
    url = await this.applyAuth(tool.auth, headers, url)

    // Build body for POST/PUT/PATCH
    let body: string | undefined
    if (config.bodyTemplate && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      body = this.interpolateBodyTemplate(config.bodyTemplate, params)
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
    }

    // Execute request
    const startTime = Date.now()
    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body,
        signal: AbortSignal.timeout(config.timeout || 5000)
      })

      const responseText = await response.text()
      let responseData: unknown

      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Extract data using JSONPath if specified
      let result = responseData
      if (config.responsePath && typeof responseData === 'object' && responseData !== null) {
        // Simple JSONPath implementation for basic paths like $.data.temperature
        const path = config.responsePath.replace(/^\$\.?/, '').split('.')
        for (const key of path) {
          if (key && result && typeof result === 'object') {
            result = (result as Record<string, unknown>)[key]
          }
        }
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      if (error instanceof Error) {
        throw new Error(`Request failed after ${duration}ms: ${error.message}`)
      }
      throw error
    }
  }

  async test(tool: Tool, params: Record<string, unknown>): Promise<TestResult> {
    const config = tool.executorConfig as HttpConfig
    const startTime = Date.now()

    try {
      // Interpolate URL with path parameters
      let url = this.interpolateUrl(config.url, params, tool.parameters)

      // Build query string for query parameters
      const queryString = this.buildQueryString(params, tool.parameters)
      if (queryString) {
        const separator = url.includes('?') ? '&' : '?'
        url += separator + queryString
      }

      // Build headers
      const headers: Record<string, string> = { ...config.headers }

      // Apply authentication
      url = await this.applyAuth(tool.auth, headers, url)

      // Build body for POST/PUT/PATCH
      let body: string | undefined
      if (config.bodyTemplate && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        body = this.interpolateBodyTemplate(config.bodyTemplate, params)
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json'
        }
      }

      const response = await fetch(url, {
        method: config.method,
        headers,
        body,
        signal: AbortSignal.timeout(config.timeout || 5000)
      })

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const responseText = await response.text()
      let responseBody: unknown
      
      try {
        responseBody = JSON.parse(responseText)
      } catch {
        responseBody = responseText
      }

      const duration = Date.now() - startTime

      return {
        success: response.ok,
        duration,
        request: {
          method: config.method,
          url,
          headers,
          body: body ? JSON.parse(body) : undefined
        },
        response: {
          status: response.status,
          headers: responseHeaders,
          body: responseBody
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        success: false,
        duration,
        request: {
          method: config.method,
          url: config.url,
          headers: config.headers,
          body: undefined
        },
        response: {
          status: 0,
          headers: {},
          body: null
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
