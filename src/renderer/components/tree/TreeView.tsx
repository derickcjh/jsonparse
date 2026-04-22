import { useRef, useCallback, useEffect } from 'react'
import { useTreeData } from '../../hooks/useTreeData'
import { useJsonWorker } from '../../hooks/useJsonWorker'
import { useStore } from '../../store'
import { TreeNodeComponent } from './TreeNode'
import { updateNodeInTree, addNodeToTree, addJsonToTree, deleteNodeFromTree, treeToJson } from '../../utils/treeHelpers'
import { ChevronsDown, ChevronsUp, TreeDeciduous } from 'lucide-react'
import { IconButton } from '../common/IconButton'
import type { TreeNode } from '../../store/types'

// Find all ancestor node IDs for a given node ID
function findAncestorIds(tree: TreeNode, targetId: string): string[] {
  const ancestors: string[] = []

  const find = (node: TreeNode, path: string[]): boolean => {
    if (node.id === targetId) {
      ancestors.push(...path)
      return true
    }
    if (node.children) {
      for (const child of node.children) {
        if (find(child, [...path, node.id])) {
          return true
        }
      }
    }
    return false
  }

  find(tree, [])
  return ancestors
}

interface TreeViewProps {
  onTreeChange: (json: string) => void
}

export function TreeView({ onTreeChange }: TreeViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const { flatNodes, toggleNode, expandAll, collapseAll } = useTreeData()
  const { expandNode } = useJsonWorker()
  const currentMatchIndex = useStore((s) => s.currentMatchIndex)
  const matchedIds = useStore((s) => s.matchedIds)
  const updateNodeChildren = useStore((s) => s.updateNodeChildren)
  const parsedTree = useStore((s) => s.parsedTree)
  const expandedIds = useStore((s) => s.expandedIds)
  const expandAllAction = useStore((s) => s.expandAll)
  const searchQuery = useStore((s) => s.searchQuery)

  // Only pass search query when there are matches (avoid unnecessary re-renders)
  const activeSearchQuery = matchedIds.length > 0 ? searchQuery : ''

  // Scroll to current match - expand ancestors first if needed
  useEffect(() => {
    if (currentMatchIndex < 0 || matchedIds.length === 0 || !containerRef.current || !parsedTree) return

    const targetId = matchedIds[currentMatchIndex]

    // Find and expand all ancestor nodes
    const ancestorIds = findAncestorIds(parsedTree, targetId)
    const collapsedAncestors = ancestorIds.filter(id => !expandedIds.has(id))

    if (collapsedAncestors.length > 0) {
      // Expand collapsed ancestors
      expandAllAction([...Array.from(expandedIds), ...collapsedAncestors])
    }

    // Wait for DOM to update, then scroll
    requestAnimationFrame(() => {
      const targetElement = containerRef.current?.querySelector(`[data-node-id="${targetId}"]`)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }, [currentMatchIndex, matchedIds, parsedTree, expandedIds, expandAllAction])

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

  const handleToggle = useCallback(
    async (id: string) => {
      // Get the latest parsedTree from store to avoid stale closure
      const currentTree = useStore.getState().parsedTree
      if (!currentTree) return

      // Check if node is truncated using current tree state
      const findTruncated = (node: TreeNode): TreeNode | null => {
        const isTruncated = (node.type === 'object' || node.type === 'array') &&
                           node.children === undefined &&
                           node.value !== undefined
        if (node.id === id && isTruncated) return node
        if (node.children) {
          for (const child of node.children) {
            const found = findTruncated(child)
            if (found) return found
          }
        }
        return null
      }

      const truncatedNode = findTruncated(currentTree)
      if (truncatedNode) {
        const result = await expandNode(
          truncatedNode.id,
          truncatedNode.value,
          truncatedNode.path,
          truncatedNode.depth
        )
        updateNodeChildren(result.nodeId, result.children, result.childIds)
      } else {
        toggleNode(id)
      }
    },
    [expandNode, updateNodeChildren, toggleNode]
  )

  const itemSize = 28

  if (!parsedTree) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/40 bg-slate-50/80 dark:bg-void-100/80 flex-shrink-0">
          <TreeDeciduous size={14} className="text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">树形视图</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
            <TreeDeciduous size={28} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm">输入有效的 JSON 以查看树形视图</p>
        </div>
      </div>
    )
  }

  const currentMatchId = currentMatchIndex >= 0 && matchedIds.length > 0
    ? matchedIds[currentMatchIndex]
    : null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/40 bg-slate-50/80 dark:bg-void-100/80 flex-shrink-0">
        <TreeDeciduous size={14} className="text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-auto">树形视图</span>
        <IconButton icon={<ChevronsDown size={14} />} label="展开全部" onClick={expandAll} />
        <IconButton icon={<ChevronsUp size={14} />} label="折叠全部" onClick={collapseAll} />
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto">
        {flatNodes.map((node) => (
          <TreeNodeComponent
            key={node.id}
            node={node}
            style={{ height: itemSize }}
            isCurrentMatch={node.id === currentMatchId}
            searchQuery={activeSearchQuery}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={handleAdd}
            onAddJson={handleAddJson}
          />
        ))}
      </div>
    </div>
  )
}
