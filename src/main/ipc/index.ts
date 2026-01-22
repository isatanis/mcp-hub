import { registerToolHandlers } from './tools'
import { registerConfigHandlers } from './config'
import { registerSecretsHandlers } from './secrets'
import { registerTestHandlers } from './test'
import { registerServerHandlers, setMainWindow } from './server'

export { setMainWindow }

export function registerAllHandlers(): void {
  registerToolHandlers()
  registerConfigHandlers()
  registerSecretsHandlers()
  registerTestHandlers()
  registerServerHandlers()
}
