import { exec } from 'child_process'
import { promisify } from 'util'
import type { Tool, CliConfig, TestResult } from '@shared/types'
import { getSecretValue } from '../../ipc/secrets'

const execAsync = promisify(exec)

export class CliExecutor {
  private interpolateCommand(command: string, params: Record<string, unknown>, toolParams: Tool['parameters']): string {
    let result = command

    // Replace parameters marked as 'argument' location
    for (const param of toolParams) {
      if ((param.location === 'argument' || param.location === 'path') && params[param.name] !== undefined) {
        // Escape shell special characters for safety
        const value = this.escapeShellArg(String(params[param.name]))
        result = result.replace(new RegExp(`\\{${param.name}\\}`, 'g'), value)
      }
    }

    // Also replace any remaining {param} placeholders
    for (const [key, value] of Object.entries(params)) {
      const escapedValue = this.escapeShellArg(String(value))
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), escapedValue)
    }

    return result
  }

  private escapeShellArg(arg: string): string {
    // Escape single quotes and wrap in single quotes for shell safety
    // This prevents command injection
    if (arg.includes("'")) {
      return `'${arg.replace(/'/g, "'\\''")}'`
    }
    // If no special characters, return as-is for readability
    if (/^[a-zA-Z0-9_./-]+$/.test(arg)) {
      return arg
    }
    return `'${arg}'`
  }

  private buildEnvironment(
    config: CliConfig,
    params: Record<string, unknown>,
    toolParams: Tool['parameters']
  ): Record<string, string> {
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...(config.env || {})
    }

    // Add parameters marked as 'env' location
    for (const param of toolParams) {
      if (param.location === 'env' && params[param.name] !== undefined) {
        // Convert param name to uppercase for env var convention
        const envName = param.name.toUpperCase()
        let value = String(params[param.name])

        // Check if it's a secret reference
        const secretValue = getSecretValue(value)
        if (secretValue) {
          value = secretValue
        }

        env[envName] = value
      }
    }

    // Resolve any secret references in config.env
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        const secretValue = getSecretValue(value)
        if (secretValue) {
          env[key] = secretValue
        }
      }
    }

    return env
  }

  async execute(tool: Tool, params: Record<string, unknown>): Promise<unknown> {
    const config = tool.executorConfig as CliConfig
    const timeout = config.timeout || 30000

    // Interpolate command with parameters
    const command = this.interpolateCommand(config.command, params, tool.parameters)

    // Build environment
    const env = this.buildEnvironment(config, params, tool.parameters)

    // Execute command
    const startTime = Date.now()
    try {
      const { stdout } = await execAsync(command, {
        cwd: config.workingDir || process.cwd(),
        env,
        timeout,
        shell: config.shell !== false ? '/bin/sh' : undefined,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      // Return stdout as the result, try to parse as JSON
      const output = stdout.trim()
      try {
        return JSON.parse(output)
      } catch {
        return output
      }
    } catch (error) {
      const duration = Date.now() - startTime
      if (error instanceof Error) {
        // exec errors include stderr in the error message
        const execError = error as Error & { stderr?: string; code?: number }
        throw new Error(
          `Command failed after ${duration}ms (exit code: ${execError.code || 'unknown'}): ${execError.stderr || execError.message}`
        )
      }
      throw error
    }
  }

  async test(tool: Tool, params: Record<string, unknown>): Promise<TestResult> {
    const config = tool.executorConfig as CliConfig
    const timeout = config.timeout || 30000
    const startTime = Date.now()

    // Interpolate command with parameters
    const command = this.interpolateCommand(config.command, params, tool.parameters)

    // Build environment (don't include process.env in the result for security)
    const env = this.buildEnvironment(config, params, tool.parameters)
    const configEnv = { ...(config.env || {}) }

    // Add param-based env vars to display
    for (const param of tool.parameters) {
      if (param.location === 'env' && params[param.name] !== undefined) {
        configEnv[param.name.toUpperCase()] = '[PROVIDED]'
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: config.workingDir || process.cwd(),
        env,
        timeout,
        shell: config.shell !== false ? '/bin/sh' : undefined,
        maxBuffer: 10 * 1024 * 1024
      })

      const duration = Date.now() - startTime

      return {
        success: true,
        duration,
        executorType: 'cli',
        command: {
          raw: command,
          workingDir: config.workingDir,
          env: Object.keys(configEnv).length > 0 ? configEnv : undefined
        },
        output: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const execError = error as Error & { stdout?: string; stderr?: string; code?: number }

      return {
        success: false,
        duration,
        executorType: 'cli',
        command: {
          raw: command,
          workingDir: config.workingDir,
          env: Object.keys(configEnv).length > 0 ? configEnv : undefined
        },
        output: {
          stdout: execError.stdout?.trim() || '',
          stderr: execError.stderr?.trim() || '',
          exitCode: execError.code || 1
        },
        error: execError.message
      }
    }
  }
}
