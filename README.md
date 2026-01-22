# MCP Tool Builder

A cross-platform Electron desktop application for creating and managing Model Context Protocol (MCP) server tools through a visual interface.

## Features

- ✨ Visual tool creation without coding
- 🔧 HTTP, CLI, and Script executors
- 🔒 Secure credential storage with Electron safeStorage
- 🧪 Built-in test console for real-time testing
- 📤 Export configurations for Claude Desktop, Cursor, and VS Code
- 🎨 Modern dark-themed UI with TailwindCSS v4
- 💾 SQLite database for tool persistence
- 🚀 MCP SDK integration with Zod validation

## Tech Stack

- **Framework**: Electron with electron-vite
- **Frontend**: React 18+ with TypeScript (strict mode)
- **Styling**: TailwindCSS v4 with custom design system
- **State Management**: Zustand v5
- **Database**: SQLite via better-sqlite3
- **MCP Runtime**: @modelcontextprotocol/sdk with Zod schemas
- **Security**: Electron safeStorage for credentials

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-tool-builder

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Project Structure

```
mcp-tool-builder/
├── src/
│   ├── main/           # Electron main process
│   │   ├── db/         # SQLite database layer
│   │   ├── ipc/        # IPC handlers
│   │   └── mcp/        # MCP server implementation
│   ├── preload/        # Preload scripts
│   ├── renderer/       # React frontend
│   │   └── src/
│   │       ├── components/   # UI components
│   │       ├── pages/        # Page components
│   │       ├── store/        # Zustand stores
│   │       └── lib/          # Utilities
│   └── shared/         # Shared types
├── out/               # Build output
└── resources/         # App resources

```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Features Overview

### Dashboard
- Tool statistics and server status
- Quick actions for common tasks
- Recently updated tools

### Tool Library
- Grid and list views
- Search and filtering
- Enable/disable tools
- Import from OpenAPI/Swagger

### Tool Editor
- Basic information configuration
- HTTP executor settings (method, URL, headers, body)
- Parameter management
- Authentication configuration

### Test Console
- Real-time tool testing
- Parameter input forms
- Response inspection
- Execution history

### Settings
- Server configuration
- Export to different platforms
- Secrets management
- Application info

## Export Targets

- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor IDE**: `~/.cursor/mcp-config.json`
- **VS Code**: `~/.vscode/mcp-config.json`

## Development

Built with modern best practices:
- TypeScript strict mode
- Functional React components
- Zustand for state management
- Type-safe IPC communication
- MCP SDK with Zod validation

## License

MIT
