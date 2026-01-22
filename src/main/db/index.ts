import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { DB_SCHEMA } from './schema'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'mcp-tools.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema
  db.exec(DB_SCHEMA)

  // Create default server config if it doesn't exist
  const configExists = db.prepare('SELECT COUNT(*) as count FROM server_config').get() as {
    count: number
  }

  if (configExists.count === 0) {
    db.prepare(
      `INSERT INTO server_config (id, name, transport, auto_start, tool_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('default', 'My MCP Server', 'stdio', 0, '[]', new Date().toISOString())
  }

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
