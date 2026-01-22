import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase, closeDatabase } from './db'
import { registerAllHandlers, setMainWindow } from './ipc'
import { startMcpServer, stopMcpServer } from './mcp/server'

const isMcpServerMode = process.argv.includes('--mcp-server')

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize database
  initDatabase()

  // MCP Server mode: run headlessly without GUI
  if (isMcpServerMode) {
    try {
      await startMcpServer()
      // Keep process alive - MCP server communicates via stdio
      // Process will be terminated by the parent (Claude Desktop, etc.)
    } catch (error) {
      console.error('Failed to start MCP server:', error)
      process.exit(1)
    }
    return
  }

  // GUI mode: normal application with window
  // Register IPC handlers (only needed for GUI mode)
  registerAllHandlers()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  const mainWindow = createWindow()
  setMainWindow(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // In MCP server mode, don't quit - there are no windows by design
  if (isMcpServerMode) return

  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopMcpServer()
  closeDatabase()
})

// Handle termination signals for MCP server mode
if (isMcpServerMode) {
  process.on('SIGINT', async () => {
    await stopMcpServer()
    closeDatabase()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await stopMcpServer()
    closeDatabase()
    process.exit(0)
  })
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
