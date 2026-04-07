import { useRef, useCallback, useEffect, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import { useTreeData } from '../../hooks/useTreeData'
import { useStore } from '../../store'
import { TreeNodeComponent } from './TreeNode'
import { updateNodeInTree, addNodeToTree, addJsonToTree, deleteNodeFromTree, treeToJson } from '../../utils/treeHelpers'
import { ChevronsDown, ChevronsUp } from 'lucide-react'
import { IconButton } from '../common/IconButton'
import type { TreeNode } from '../../store/types'

interface TreeViewProps {
  onTreeChange: (json: string) => void
}

export function TreeView({ onTreeChange }: TreeViewProps): JSX.Element {
  const listRef = useRef<List>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(400)
  const { flatNodes, toggleNode, expandAll, collapseAll } = useTreeData()
  const currentMatchIndex = useStore((s) => s.currentMatchIndex)
  const matchedIds = useStore((s) => s.matchedIds)

  // Scroll to current match
  useEffect(() => {
    if (currentMatchIndex < 0 || matchedIds.length === 0) return
    const targetId = matchedIds[currentMatchIndex]
    const index = flatNodes.findIndex((n) => n.id === targetId)
    if (index >= 0) {
      listRef.current?.scrollToItem(index, 'center')
    }
  }, [currentMatchIndex, matchedIds, flatNodes])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const syncTreeToEditor = useCallback(
    (newTree: TreeNode | null) => {
      if (!newTree) return
      useStore.getState().setParsedTree(newTree)
      const json = JSON.stringify(treeToJson(newTree), null, 2)
      onTreeChange(json)
    },
    [onTreeChange]
  )

  const handleEdit = useCallback(
    (nodeId: string, key: string | number, value: unknown, type: TreeNode['type']) => {
      const tree = useStore.getState().parsedTree
      if (!tree) return
      const updated = updateNodeInTree(tree, nodeId, key, value, type)
      syncTreeToEditor(updated)
    },
    [syncTreeToEditor]
  )

  const handleAdd = useCallback(
    (parentId: string, key: string | number, value: unknown, type: TreeNode['type']) => {
      const tree = useStore.getState().parsedTree
      if (!tree) return
      const updated = addNodeToTree(tree, parentId, key, value, type)
      syncTreeToEditor(updated)
    },
    [syncTreeToEditor]
  )

  const handleAddJson = useCallback(
    (parentId: string, key: string, jsonValue: unknown) => {
      const tree = useStore.getState().parsedTree
      if (!tree) return
      const updated = addJsonToTree(tree, parentId, jsonValue, key)
      syncTreeToEditor(updated)
    },
    [syncTreeToEditor]
  )

  const handleDelete = useCallback(
    (nodeId: string) => {
      const tree = useStore.getState().parsedTree
      if (!tree) return
      const updated = deleteNodeFromTree(tree, nodeId)
      syncTreeToEditor(updated)
    },
    [syncTreeToEditor]
  )

  const parsedTree = useStore((s) => s.parsedTree)

  if (!parsedTree) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        输入有效的 JSON 以查看树形视图
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-auto">树形视图</span>
        <IconButton icon={<ChevronsDown size={14} />} label="展开全部" onClick={expandAll} />
        <IconButton icon={<ChevronsUp size={14} />} label="折叠全部" onClick={collapseAll} />
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <List
          ref={listRef}
          height={height}
          itemCount={flatNodes.length}
          itemSize={28}
          width="100%"
          overscanCount={20}
        >
          {({ index, style }) => (
            <TreeNodeComponent
              node={flatNodes[index]}
              style={style}
              onToggle={toggleNode}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onAddJson={handleAddJson}
            />
          )}
        </List>
      </div>
    </div>
  )
}
