export const DB_SCHEMA = `
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  executor_type TEXT NOT NULL,
  executor_config TEXT NOT NULL,
  parameters TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS server_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  transport TEXT DEFAULT 'stdio',
  port INTEGER,
  auto_start INTEGER DEFAULT 0,
  tool_ids TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  success INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  request TEXT NOT NULL,
  response TEXT,
  error TEXT,
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(enabled);
CREATE INDEX IF NOT EXISTS idx_logs_tool_id ON execution_logs(tool_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON execution_logs(timestamp);
`
