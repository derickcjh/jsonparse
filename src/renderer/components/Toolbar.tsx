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

interface ToolbarProps {
  onFormat: () => void
  onMinify: () => void
  onValidate: () => void
}

export function Toolbar({ onFormat, onMinify, onValidate }: ToolbarProps): JSX.Element {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const setRawText = useStore((s) => s.setRawText)

  const handleOpen = async (): Promise<void> => {
    const result = await window.electronAPI?.openFile()
    if (result) {
      setRawText(result.content, 'editor')
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
