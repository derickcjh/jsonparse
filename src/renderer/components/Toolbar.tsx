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
    <div className="titlebar-drag flex items-center gap-1 h-12 px-20 bg-white/80 dark:bg-void-50/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/50 relative z-10">
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent" />

      <div className="titlebar-no-drag flex items-center gap-0.5">
        <IconButton icon={<AppWindow size={16} />} label="新建窗口" onClick={() => window.electronAPI?.newWindow()} />
        <IconButton icon={<FolderOpen size={16} />} label="打开文件" onClick={handleOpen} />
        <IconButton icon={<Save size={16} />} label="保存文件" onClick={handleSave} />

        <div className="w-px h-5 bg-slate-300/50 dark:bg-slate-600/50 mx-2" />

        <IconButton icon={<Braces size={16} />} label="格式化" onClick={onFormat} />
        <IconButton icon={<Minimize2 size={16} />} label="压缩" onClick={onMinify} />
        <IconButton icon={<CheckCircle size={16} />} label="校验" onClick={onValidate} />
      </div>

      <div className="flex-1 titlebar-drag" />

      <div className="titlebar-no-drag flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50">
        <FileJson size={14} className="text-accent" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
          JSON Parse
        </span>
      </div>

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
