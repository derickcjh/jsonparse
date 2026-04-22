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
  string: 'text-green-600 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-amber-600 dark:text-amber-400',
  null: 'text-gray-400 dark:text-gray-500'
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
      <mark className="bg-orange-300 dark:bg-orange-600 text-inherit rounded-sm px-0.5">{match}</mark>
      {after}
    </>
  )
}

function CopiedTip({ show }: { show: boolean }): JSX.Element | null {
  if (!show) return null
  return (
    <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] bg-gray-800 text-white rounded shadow whitespace-nowrap z-50 pointer-events-none">
      copied
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

  const indent = node.depth * 20

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
        return <span className="text-gray-400 text-xs">{`{${count} keys} ▶`}</span>
      }
      const count = node.children?.length ?? 0
      return <span className="text-gray-400 text-xs">{`{${count} keys}`}</span>
    }
    if (node.type === 'array') {
      // Check if truncated (has value but no children)
      if (node.children === undefined && node.value !== undefined) {
        const count = (node.value as unknown[]).length
        return <span className="text-gray-400 text-xs">{`[${count} items] ▶`}</span>
      }
      const count = node.children?.length ?? 0
      return <span className="text-gray-400 text-xs">{`[${count} items]`}</span>
    }
    const color = valueColors[node.type] || ''
    const valueStr = node.type === 'string' ? String(node.value) : String(node.value)
    const display = node.type === 'string' ? `"${valueStr}"` : valueStr

    // Only highlight if this node is highlighted (matched)
    if (node.highlighted && searchQuery) {
      return (
        <span className={`text-xs ${color}`}>
          {node.type === 'string' ? '"' : ''}
          {highlightText(valueStr, searchQuery)}
          {node.type === 'string' ? '"' : ''}
        </span>
      )
    }
    return <span className={`text-xs ${color}`}>{display}</span>
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
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
      return 'bg-orange-200 dark:bg-orange-700/50 ring-2 ring-orange-400 dark:ring-orange-500'
    }
    if (node.highlighted) {
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    }
    return 'hover:bg-gray-100 dark:hover:bg-gray-800'
  }

  return (
    <div
      style={style}
      data-node-id={node.id}
      className={`flex items-center px-2 group ${getBgClass()}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: indent, flexShrink: 0 }} />

      {/* Expand/collapse toggle — select-none so dragging here won't select text */}
      {node.hasChildren ? (
        <span
          className="w-4 h-4 flex items-center justify-center text-gray-400 flex-shrink-0 cursor-pointer select-none"
          onClick={() => onToggle(node.id)}
        >
          {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* Key — selectable, double-click to copy full key */}
      <span
        className="relative text-xs font-medium text-purple-600 dark:text-purple-400 mr-1 truncate max-w-[200px] cursor-text select-text"
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

      {!isRoot && <span className="text-gray-400 text-xs mr-1 select-none">:</span>}

      {/* Value — selectable, click to show popover for long values, double-click to copy */}
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
        <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
          <button
            className="p-0.5 text-gray-400 hover:text-blue-500 rounded"
            title="编辑"
            onClick={handleEditClick}
          >
            <Pencil size={12} />
          </button>
          {(node.type === 'object' || node.type === 'array') && (
            <button
              className="p-0.5 text-gray-400 hover:text-green-500 rounded"
              title="添加子节点"
              onClick={() => setAdding(true)}
            >
              <Plus size={12} />
            </button>
          )}
          <button
            className="p-0.5 text-gray-400 hover:text-red-500 rounded"
            title="删除"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 size={12} />
          </button>
          <button
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
            title="复制路径"
            onClick={() => copyToClipboard(node.path)}
          >
            <Copy size={12} />
          </button>
          <button
            className="p-0.5 text-gray-400 hover:text-cyan-500 rounded"
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
