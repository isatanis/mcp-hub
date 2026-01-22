import { ipcMain, safeStorage } from 'electron'
import { getDatabase } from '../db'

function encryptValue(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    return encrypted.toString('base64')
  }
  // Fallback: base64 encode (not secure, but better than plaintext)
  return Buffer.from(value).toString('base64')
}

function decryptValue(encryptedValue: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encryptedValue, 'base64')
    return safeStorage.decryptString(buffer)
  }
  // Fallback: base64 decode
  return Buffer.from(encryptedValue, 'base64').toString('utf-8')
}

export function registerSecretsHandlers(): void {
  ipcMain.handle('secrets:store', async (_, key: string, value: string) => {
    const db = getDatabase()
    const now = new Date().toISOString()
    const encryptedValue = encryptValue(value)

    // Upsert - insert or update
    const existing = db.prepare('SELECT key FROM secrets WHERE key = ?').get(key)
    
    if (existing) {
      db.prepare('UPDATE secrets SET value = ?, updated_at = ? WHERE key = ?')
        .run(encryptedValue, now, key)
    } else {
      db.prepare('INSERT INTO secrets (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(key, encryptedValue, now, now)
    }
  })

  ipcMain.handle('secrets:retrieve', async (_, key: string) => {
    const db = getDatabase()
    const result = db.prepare('SELECT value FROM secrets WHERE key = ?').get(key) as { value: string } | undefined
    
    if (!result) return null
    
    return decryptValue(result.value)
  })

  ipcMain.handle('secrets:delete', async (_, key: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM secrets WHERE key = ?').run(key)
  })

  ipcMain.handle('secrets:list', async () => {
    const db = getDatabase()
    const results = db.prepare('SELECT key FROM secrets ORDER BY key').all() as Array<{ key: string }>
    return results.map(r => r.key)
  })
}

// Helper function to get a secret value (for use in other main process modules)
export function getSecretValue(key: string): string | null {
  const db = getDatabase()
  const result = db.prepare('SELECT value FROM secrets WHERE key = ?').get(key) as { value: string } | undefined
  
  if (!result) return null
  
  return decryptValue(result.value)
}
