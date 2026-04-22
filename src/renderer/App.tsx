import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { Toolbar } from './components/Toolbar'
import { SplitPanel } from './components/SplitPanel'
import { MonacoEditor } from './components/editor/MonacoEditor'
import { TreeView } from './components/tree/TreeView'
import { SearchBar } from './components/SearchBar'
import { useJsonWorker } from './hooks/useJsonWorker'

function Toast(): JSX.Element | null {
  const message = useStore((s) => s.toastMessage)
  const type = useStore((s) => s.toastType)
  const clearToast = useStore((s) => s.clearToast)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(clearToast, 3000)
    return () => clearTimeout(timer)
  }, [message, clearToast])

  if (!message) return null

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {message}
    </div>
  )
}

function LoadingBar(): JSX.Element | null {
  const isLoading = useStore((s) => s.isLoading)
  const progress = useStore((s) => s.loadingProgress)

  if (!isLoading) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-700 z-50">
      <div
        className="h-full bg-blue-500 transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function App(): JSX.Element {
  const theme = useStore((s) => s.theme)
  const { parse, format, minify, validate } = useJsonWorker()
  const parseVersionRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const loadFileContent = useCallback(
    async (content: string) => {
      const store = useStore.getState()
      store.setRawText(content, 'editor')
      if (!content.trim()) {
        store.setParsedTree(null)
        store.setValidationErrors([])
        return
      }
      try {
        const result = await parse(content)
        store.setParsedTree(result.tree)
        store.setValidationErrors(result.errors)
        if (result.tree && result.allIds.length <= 200) {
          store.expandAll(result.allIds)
        }
        store.showToast('文件加载成功', 'success')
      } catch {
        store.showToast('JSON 解析失败', 'error')
      }
    },
    [parse]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const file = files[0]
      if (!file) return

      if (file.path && window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile(file.path)
        if (result) {
          loadFileContent(result.content)
        }
      } else {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          if (content) {
            loadFileContent(content)
          }
        }
        reader.readAsText(file)
      }
    },
    [loadFileContent]
  )

  // When editor content changes, parse it in worker
  const handleEditorChange = useCallback(
    async (text: string) => {
      const store = useStore.getState()
      // Prevent loop: if this update came from tree sync, skip
      if (store.syncSource === 'tree') return

      store.setRawText(text, 'editor')
      if (!text.trim()) {
        store.setParsedTree(null)
        store.setValidationErrors([])
        return
      }

      const version = ++parseVersionRef.current
      try {
        const result = await parse(text)
        // Stale check: only apply if this is still the latest parse
        if (version !== parseVersionRef.current) return
        store.setParsedTree(result.tree)
        store.setValidationErrors(result.errors)
        // Auto-expand first 2 levels for small trees
        if (result.tree && result.allIds.length <= 200) {
          store.expandAll(result.allIds)
        }
      } catch {
        // Invalid JSON, ignore parse errors
      }
    },
    [parse]
  )

  // When tree changes, sync back to editor
  const handleTreeChange = useCallback((json: string) => {
    useStore.getState().setRawText(json, 'tree')
  }, [])

  const handleFormat = useCallback(async () => {
    const text = useStore.getState().rawText
    if (!text.trim()) return
    try {
      const result = await format(text)
      useStore.getState().setRawText(result, 'tree')
      useStore.getState().showToast('格式化成功', 'success')
    } catch {
      useStore.getState().showToast('JSON 格式错误，无法格式化', 'error')
    }
  }, [format])

  const handleMinify = useCallback(async () => {
    const text = useStore.getState().rawText
    if (!text.trim()) return
    try {
      const result = await minify(text)
      useStore.getState().setRawText(result, 'tree')
      useStore.getState().showToast('压缩成功', 'success')
    } catch {
      useStore.getState().showToast('JSON 格式错误，无法压缩', 'error')
    }
  }, [minify])

  const handleValidate = useCallback(async () => {
    const text = useStore.getState().rawText
    if (!text.trim()) {
      useStore.getState().showToast('请输入 JSON', 'error')
      return
    }
    const result = await validate(text)
    if (result.valid) {
      useStore.getState().showToast('JSON 格式正确', 'success')
    } else {
      useStore.getState().showToast(`JSON 错误: ${result.errors[0]?.message}`, 'error')
    }
  }, [validate])

  return (
    <div
      className="h-full flex flex-col bg-white dark:bg-gray-900 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar onFormat={handleFormat} onMinify={handleMinify} onValidate={handleValidate} />

      <div className="flex-1 overflow-hidden">
        <SplitPanel
          left={<MonacoEditor onContentChange={handleEditorChange} />}
          right={
            <>
              <SearchBar />
              <TreeView onTreeChange={handleTreeChange} />
            </>
          }
        />
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-lg">
            <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
              释放以打开文件
            </p>
          </div>
        </div>
      )}

      <Toast />
      <LoadingBar />
    </div>
  )
}

export default App
