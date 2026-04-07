import { useRef, useCallback, useEffect } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useStore } from '../../store'

interface MonacoEditorProps {
  onContentChange: (value: string) => void
}

export function MonacoEditor({ onContentChange }: MonacoEditorProps): JSX.Element {
  const theme = useStore((s) => s.theme)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUpdatingFromExternal = useRef(false)

  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed
    ed.focus()
  }, [])

  const handleChange = useCallback(
    (value: string | undefined) => {
      // Skip if this change was triggered by our own external update
      if (isUpdatingFromExternal.current) return
      if (value === undefined) return

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onContentChange(value)
      }, 300)
    },
    [onContentChange]
  )

  // Listen for external rawText updates (from tree edits, format, etc.)
  useEffect(() => {
    const unsub = useStore.subscribe(
      (state) => ({ rawText: state.rawText, syncSource: state.syncSource }),
      (curr, prev) => {
        // Only update editor when change came from tree (not from editor itself)
        if (curr.syncSource === 'tree' && curr.rawText !== prev.rawText && editorRef.current) {
          isUpdatingFromExternal.current = true
          const model = editorRef.current.getModel()
          if (model) {
            editorRef.current.setValue(curr.rawText)
          }
          // Reset flag after a tick
          requestAnimationFrame(() => {
            isUpdatingFromExternal.current = false
          })
        }
      },
      { equalityFn: (a, b) => a.rawText === b.rawText && a.syncSource === b.syncSource }
    )
    return unsub
  }, [])

  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      defaultValue=""
      onChange={handleChange}
      onMount={handleMount}
      options={{
        fontSize: 13,
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'off',
        bracketPairColorization: { enabled: true },
        padding: { top: 8 },
        renderWhitespace: 'none',
        smoothScrolling: true
      }}
    />
  )
}
