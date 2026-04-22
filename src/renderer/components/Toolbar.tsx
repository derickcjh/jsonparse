import {
  FileJson,
  Minimize2,
  CheckCircle,
  FolderOpen,
  Save,
  Sun,
  Moon,
  Braces,
  AppWindow
} from 'lucide-react'
import { IconButton } from './common/IconButton'
import { useStore } from '../store'
import { useJsonWorker } from '../hooks/useJsonWorker'

interface ToolbarProps {
  onFormat: () => void
  onMinify: () => void
  onValidate: () => void
}

export function Toolbar({ onFormat, onMinify, onValidate }: ToolbarProps): JSX.Element {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const { parse } = useJsonWorker()

  const handleOpen = async (): Promise<void> => {
    const result = await window.electronAPI?.openFile()
    if (result) {
      const store = useStore.getState()
      const fileSize = (result.content.length / 1024 / 1024).toFixed(2)

      // Show progress bar immediately with initial value
      store.setLoading(true, `正在解析文件 (${fileSize} MB)...`)
      store.setLoadingProgress(5)

      // Wait for UI to render the progress bar
      await new Promise(resolve => setTimeout(resolve, 16))
      store.setLoadingProgress(15)
      await new Promise(resolve => setTimeout(resolve, 16))
      store.setLoadingProgress(25)
      await new Promise(resolve => setTimeout(resolve, 16))

      // Start smooth animation
      let progress = 25
      let targetProgress = 80
      const progressInterval = setInterval(() => {
        progress += (targetProgress - progress) * 0.12
        store.setLoadingProgress(Math.min(Math.round(progress), targetProgress))
        if (progress >= 99.5) {
          clearInterval(progressInterval)
          store.setLoadingProgress(100)
          setTimeout(() => store.setLoading(false), 150)
        }
      }, 25)

      store.setRawText(result.content, 'tree')

      if (result.content.trim()) {
        try {
          // Measure only the actual parsing time
          const startTime = performance.now()
          const parsed = await parse(result.content)
          const parseTime = (performance.now() - startTime).toFixed(0)

          store.setParsedTree(parsed.tree)
          store.setValidationErrors(parsed.errors)
          if (parsed.tree && parsed.allIds.length <= 200) {
            store.expandAll(parsed.allIds)
          }

          // Parsing done - animate to 100%
          targetProgress = 100
          store.showToast(`文件加载成功，解析耗时 ${parseTime}ms`, 'success')
        } catch {
          clearInterval(progressInterval)
          store.setLoading(false)
          store.showToast('JSON 解析失败', 'error')
        }
      } else {
        clearInterval(progressInterval)
        store.setLoading(false)
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    const rawText = useStore.getState().rawText
    await window.electronAPI?.saveFile(rawText)
  }

  return (
    <div className="titlebar-drag flex items-center gap-1 h-10 px-20 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="titlebar-no-drag flex items-center gap-1">
        <IconButton icon={<AppWindow size={16} />} label="新建窗口" onClick={() => window.electronAPI?.newWindow()} />
        <IconButton icon={<FolderOpen size={16} />} label="打开文件" onClick={handleOpen} />
        <IconButton icon={<Save size={16} />} label="保存文件" onClick={handleSave} />

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        <IconButton icon={<Braces size={16} />} label="格式化" onClick={onFormat} />
        <IconButton icon={<Minimize2 size={16} />} label="压缩" onClick={onMinify} />
        <IconButton icon={<CheckCircle size={16} />} label="校验" onClick={onValidate} />
      </div>

      <div className="flex-1 titlebar-drag" />

      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 titlebar-no-drag select-none">
        <FileJson size={14} className="inline mr-1" />
        JSON Parse
      </span>

      <div className="flex-1 titlebar-drag" />

      <div className="titlebar-no-drag">
        <IconButton
          icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          label="切换主题"
          onClick={toggleTheme}
        />
      </div>
    </div>
  )
}
