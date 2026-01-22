import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { DB_SCHEMA } from './schema'

let db: Database.Database | null = null

function runMigrations(database: Database.Database): void {
  // Get existing columns in execution_logs
  const columns = database.prepare("PRAGMA table_info(execution_logs)").all() as Array<{ name: string }>
  const columnNames = columns.map(c => c.name)

  // Add missing columns
  const migrations: Array<{ column: string; sql: string }> = [
    { column: 'tool_name', sql: 'ALTER TABLE execution_logs ADD COLUMN tool_name TEXT' },
    { column: 'executor_type', sql: 'ALTER TABLE execution_logs ADD COLUMN executor_type TEXT' },
    { column: 'source', sql: "ALTER TABLE execution_logs ADD COLUMN source TEXT DEFAULT 'test'" },
    { column: 'input_size', sql: 'ALTER TABLE execution_logs ADD COLUMN input_size INTEGER' },
    { column: 'output_size', sql: 'ALTER TABLE execution_logs ADD COLUMN output_size INTEGER' }
  ]

  for (const migration of migrations) {
    if (!columnNames.includes(migration.column)) {
      try {
        database.exec(migration.sql)
      } catch (error) {
        // Column might already exist, ignore
        console.log(`Migration for ${migration.column} skipped:`, error)
      }
    }
  }
}

export function initDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'mcp-tools.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema
  db.exec(DB_SCHEMA)

  // Run migrations for existing databases
  runMigrations(db)

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
