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
      className={`
        fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium z-50
        animate-slide-up backdrop-blur-md shadow-lg
        ${type === 'success'
          ? 'bg-emerald-500/90 text-white shadow-emerald-500/20'
          : 'bg-red-500/90 text-white shadow-red-500/20'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {message}
      </div>
    </div>
  )
}

function LoadingBar(): JSX.Element | null {
  const isLoading = useStore((s) => s.isLoading)
  const progress = useStore((s) => s.loadingProgress)

  if (!isLoading) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1 bg-slate-200/50 dark:bg-slate-800/50 z-50 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-accent via-accent-light to-accent transition-all duration-150 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-white/30 animate-pulse" />
      </div>
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
      className="h-full flex flex-col relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar onFormat={handleFormat} onMinify={handleMinify} onValidate={handleValidate} />

      <div className="flex-1 overflow-hidden">
        <SplitPanel
          left={<MonacoEditor onContentChange={handleEditorChange} />}
          right={
            <div className="h-full flex flex-col bg-white/50 dark:bg-void-50/50">
              <SearchBar />
              <TreeView onTreeChange={handleTreeChange} />
            </div>
          }
        />
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-accent/10 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-void-100 px-8 py-6 rounded-2xl shadow-2xl border border-accent/20 glow-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800 dark:text-white">
                  释放以打开文件
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  支持 JSON、文本文件
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast />
      <LoadingBar />
    </div>
  )
}

export default App
