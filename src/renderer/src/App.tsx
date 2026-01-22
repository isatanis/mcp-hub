import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { ToolList } from './pages/ToolList'
import { ToolEditor } from './pages/ToolEditor'
import { TestConsole } from './pages/TestConsole'
import { Settings } from './pages/Settings'
import { ToastProvider } from './components/ui/toast'
import './assets/globals.css'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tools" element={<ToolList />} />
            <Route path="/tools/new" element={<ToolEditor />} />
            <Route path="/tools/:id" element={<ToolEditor />} />
            <Route path="/test-console" element={<TestConsole />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
