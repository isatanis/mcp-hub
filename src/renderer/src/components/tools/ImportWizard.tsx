import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileCode } from 'lucide-react'

interface ImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onImport: (spec: string) => void
}

export function ImportWizard({ isOpen, onClose, onImport }: ImportWizardProps) {
  const [spec, setSpec] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    try {
      JSON.parse(spec)
      onImport(spec)
      setSpec('')
      setError(null)
      onClose()
    } catch (err) {
      setError('Invalid JSON format. Please check your OpenAPI/Swagger specification.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSpec(event.target?.result as string)
        setError(null)
      }
      reader.readAsText(file)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import OpenAPI/Swagger Specification">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
            <div className="flex items-center gap-3 mb-3">
              <FileCode className="size-5 text-primary" />
              <h3 className="font-medium text-white">Paste Specification</h3>
            </div>
            <Textarea
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="Paste your OpenAPI 3.0 or Swagger 2.0 JSON here..."
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-dark" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface-dark px-2 text-text-secondary">Or</span>
            </div>
          </div>

          <div className="bg-background-dark rounded-lg p-6 border border-border-dark border-dashed">
            <div className="flex flex-col items-center gap-3 text-center">
              <Upload className="size-8 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Upload Specification File</p>
                <p className="text-xs text-text-secondary">JSON or YAML format</p>
              </div>
              <label htmlFor="file-upload" className="inline-block">
                <Button variant="secondary" size="sm" type="button">
                  Choose File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!spec}>
            Import Tools
          </Button>
        </div>
      </div>
    </Modal>
  )
}
