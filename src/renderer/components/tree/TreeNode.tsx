import { memo, useState, useCallback, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Copy,
  ClipboardCopy
} from 'lucide-react'
import type { FlatNode, TreeNode as TreeNodeType } from '../../store/types'
import { TreeNodeEditor } from './TreeNodeEditor'
import { copyToClipboard } from '../../utils/jsonPath'
import { treeToJson } from '../../utils/treeHelpers'
import { ValuePopover } from './ValuePopover'
import { ValueEditModal } from './ValueEditModal'

interface TreeNodeProps {
  node: FlatNode
  style: React.CSSProperties
  isCurrentMatch?: boolean
  searchQuery?: string
  onToggle: (id: string) => void
  onEdit: (nodeId: string, key: string | number, value: unknown, type: TreeNodeType['type']) => void
  onDelete: (nodeId: string) => void
  onAdd: (parentId: string, key: string | number, value: unknown, type: TreeNodeType['type']) => void
  onAddJson: (parentId: string, key: string, jsonValue: unknown) => void
}

const valueColors: Record<string, string> = {
  string: 'text-emerald-600 dark:text-emerald-400',
  number: 'text-orange-500 dark:text-orange-400',
  boolean: 'text-amber-600 dark:text-amber-400',
  null: 'text-cyan-500 dark:text-cyan-400'
}

// Highlight matching text within a string
function highlightText(text: string, query: string | undefined): JSX.Element {
  if (!query || !text) return <>{text}</>

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) return <>{text}</>

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <>
      {before}
      <mark className="bg-amber-300/80 dark:bg-amber-500/40 text-inherit rounded px-0.5 -mx-0.5">{match}</mark>
      {after}
    </>
  )
}

function CopiedTip({ show }: { show: boolean }): JSX.Element | null {
  if (!show) return null
  return (
    <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-medium bg-slate-800 dark:bg-slate-700 text-white rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none animate-fade-in">
      Copied!
    </span>
  )
}

export const TreeNodeComponent = memo(function TreeNodeComponent({
  node,
  style,
  isCurrentMatch,
  searchQuery,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onAddJson
}: TreeNodeProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedValue, setCopiedValue] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const valueRef = useRef<HTMLSpanElement>(null)

  const indent = node.depth * 16

  const showCopiedTip = useCallback((setter: (v: boolean) => void) => {
    setter(true)
    setTimeout(() => setter(false), 800)
  }, [])

  // Double-click key to copy
  const handleCopyKey = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      copyToClipboard(String(node.key))
      showCopiedTip(setCopiedKey)
    },
    [node.key, showCopiedTip]
  )

  // Double-click value to copy
  const handleCopyValue = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      let text: string
      if (node.type === 'object' || node.type === 'array') {
        text = JSON.stringify(treeToJson(node), null, 2)
      } else if (node.type === 'string') {
        text = String(node.value)
      } else {
        text = String(node.value)
      }
      copyToClipboard(text)
      showCopiedTip(setCopiedValue)
    },
    [node, showCopiedTip]
  )

  // Click value to show popover for long values
  const handleValueClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const valueStr = node.type === 'object' || node.type === 'array'
        ? JSON.stringify(treeToJson(node), null, 2)
        : String(node.value)
      // Only show popover for values longer than 30 chars or multiline
      if (valueStr.length > 30 || valueStr.includes('\n')) {
        const rect = valueRef.current?.getBoundingClientRect()
        if (rect) {
          setPopoverAnchor(rect)
          setShowPopover(true)
        }
      }
    },
    [node]
  )

  const getPopoverValue = useCallback(() => {
    if (node.type === 'object' || node.type === 'array') {
      return JSON.stringify(treeToJson(node), null, 2)
    }
    return String(node.value)
  }, [node])

  // Check if value is long enough to use modal editing
  const isLongValue = useCallback(() => {
    const valueStr = node.type === 'object' || node.type === 'array'
      ? JSON.stringify(treeToJson(node), null, 2)
      : String(node.value ?? '')
    return valueStr.length > 50 || valueStr.includes('\n')
  }, [node])

  const handleEditClick = useCallback(() => {
    if (isLongValue()) {
      setShowEditModal(true)
    } else {
      setEditing(true)
    }
  }, [isLongValue])

  const handleModalSave = useCallback(
    (key: string | number, value: unknown, type: TreeNodeType['type']) => {
      onEdit(node.id, key, value, type)
    },
    [node.id, onEdit]
  )

  const renderValue = (): JSX.Element | null => {
    if (node.type === 'object') {
      // Check if truncated (has value but no children)
      if (node.children === undefined && node.value !== undefined) {
        const count = Object.keys(node.value as Record<string, unknown>).length
        return <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{`{ ${count} }`} <span className="text-accent/60">...</span></span>
      }
      const count = node.children?.length ?? 0
      return <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{`{ ${count} }`}</span>
    }
    if (node.type === 'array') {
      // Check if truncated (has value but no children)
      if (node.children === undefined && node.value !== undefined) {
        const count = (node.value as unknown[]).length
        return <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{`[ ${count} ]`} <span className="text-accent/60">...</span></span>
      }
      const count = node.children?.length ?? 0
      return <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{`[ ${count} ]`}</span>
    }
    const color = valueColors[node.type] || ''
    const valueStr = node.type === 'string' ? String(node.value) : String(node.value)
    const display = node.type === 'string' ? `"${valueStr}"` : valueStr

    // Only highlight if this node is highlighted (matched)
    if (node.highlighted && searchQuery) {
      return (
        <span className={`text-xs font-mono ${color}`}>
          {node.type === 'string' ? '"' : ''}
          {highlightText(valueStr, searchQuery)}
          {node.type === 'string' ? '"' : ''}
        </span>
      )
    }
    return <span className={`text-xs font-mono ${color}`}>{display}</span>
  }

  if (editing) {
    return (
      <div style={style}>
        <TreeNodeEditor
          node={node}
          onSave={(key, value, type) => {
            onEdit(node.id, key, value, type)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  if (adding) {
    return (
      <div style={{ ...style, overflow: 'visible', zIndex: 20, position: 'relative' }}>
        <div style={{ paddingLeft: indent }} className="px-2">
          <div className="bg-white dark:bg-void-100 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
            <TreeNodeEditor
              node={node}
              isAdd
              onSave={(key, value, type) => {
                onAdd(node.id, key, value, type)
                setAdding(false)
              }}
              onSaveJson={(key, jsonValue) => {
                onAddJson(node.id, key, jsonValue)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      </div>
    )
  }

  const isRoot = node.depth === 0 && node.key === 'root'

  // Determine background style
  const getBgClass = () => {
    if (isCurrentMatch) {
      return 'bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-400/50 dark:ring-amber-500/30'
    }
    if (node.highlighted) {
      return 'bg-amber-50/80 dark:bg-amber-900/20'
    }
    return 'hover:bg-slate-100/80 dark:hover:bg-slate-800/40'
  }

  return (
    <div
      style={style}
      data-node-id={node.id}
      className={`flex items-center px-3 group transition-colors duration-100 ${getBgClass()}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: indent, flexShrink: 0 }} />

      {/* Expand/collapse toggle */}
      {node.hasChildren ? (
        <span
          className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0 cursor-pointer select-none hover:text-accent transition-colors rounded"
          onClick={() => onToggle(node.id)}
        >
          {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      ) : (
        <span className="w-5 flex-shrink-0" />
      )}

      {/* Key */}
      <span
        className="relative text-xs font-semibold text-violet-600 dark:text-violet-400 mr-1.5 truncate max-w-[180px] cursor-text select-text font-mono"
        onDoubleClick={isRoot ? undefined : handleCopyKey}
        title={isRoot ? undefined : `双击复制 key`}
      >
        {isRoot
          ? (node.type === 'array' ? '[ ]' : '{ }')
          : (node.highlighted && searchQuery
              ? highlightText(String(node.key), searchQuery)
              : String(node.key)
            )
        }
        <CopiedTip show={copiedKey} />
      </span>

      {!isRoot && <span className="text-slate-300 dark:text-slate-600 text-xs mr-1.5 select-none">:</span>}

      {/* Value */}
      <span
        ref={valueRef}
        className="relative truncate flex-1 cursor-pointer select-text"
        onClick={handleValueClick}
        onDoubleClick={handleCopyValue}
        title="点击查看完整内容，双击复制"
      >
        {renderValue()}
        <CopiedTip show={copiedValue} />
      </span>

      {/* Value popover */}
      {showPopover && popoverAnchor && (
        <ValuePopover
          value={getPopoverValue()}
          type={node.type}
          anchorRect={popoverAnchor}
          onClose={() => setShowPopover(false)}
        />
      )}

      {/* Value edit modal */}
      {showEditModal && (
        <ValueEditModal
          nodeKey={node.key}
          value={getPopoverValue()}
          type={node.type}
          onSave={handleModalSave}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Action buttons */}
      {hovered && (
        <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 select-none opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            className="p-1 text-slate-400 hover:text-accent hover:bg-accent/10 rounded transition-colors"
            title="编辑"
            onClick={handleEditClick}
          >
            <Pencil size={12} />
          </button>
          {(node.type === 'object' || node.type === 'array') && (
            <button
              className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
              title="添加子节点"
              onClick={() => setAdding(true)}
            >
              <Plus size={12} />
            </button>
          )}
          <button
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
            title="删除"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 size={12} />
          </button>
          <button
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-500/10 rounded transition-colors"
            title="复制路径"
            onClick={() => copyToClipboard(node.path)}
          >
            <Copy size={12} />
          </button>
          <button
            className="p-1 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 rounded transition-colors"
            title="复制 key:value"
            onClick={() => {
              const val = node.type === 'object' || node.type === 'array'
                ? JSON.stringify(treeToJson(node), null, 2)
                : node.type === 'string' ? `"${node.value}"` : String(node.value)
              copyToClipboard(`"${node.key}": ${val}`)
            }}
          >
            <ClipboardCopy size={12} />
          </button>
        </div>
      )}
    </div>
  )
})
