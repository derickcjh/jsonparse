import { useMemo, useCallback } from 'react'
import { useStore } from '../store'
import type { TreeNode, FlatNode } from '../store/types'

function isTruncatedNode(node: TreeNode): boolean {
  return (node.type === 'object' || node.type === 'array') &&
         node.children === undefined &&
         node.value !== undefined
}

function flattenTree(
  node: TreeNode,
  expandedIds: Set<string>,
  matchedIds: Set<string>
): FlatNode[] {
  const isTruncated = isTruncatedNode(node)
  const hasChildren = !!(node.children && node.children.length > 0) || isTruncated
  // Truncated nodes should show collapsed arrow until children are loaded
  const expanded = isTruncated ? false : expandedIds.has(node.id)
  const highlighted = matchedIds.has(node.id)

  const flat: FlatNode[] = [{ ...node, hasChildren, expanded, highlighted }]

  if (hasChildren && expanded && node.children) {
    for (const child of node.children) {
      flat.push(...flattenTree(child, expandedIds, matchedIds))
    }
  }

  return flat
}

export function useTreeData(): {
  flatNodes: FlatNode[]
  toggleNode: (id: string) => void
  expandAll: () => void
  collapseAll: () => void
  findTruncatedNode: (id: string) => TreeNode | null
} {
  const parsedTree = useStore((s) => s.parsedTree)
  const expandedIds = useStore((s) => s.expandedIds)
  const matchedIds = useStore((s) => s.matchedIds)
  const toggleExpanded = useStore((s) => s.toggleExpanded)
  const expandAllAction = useStore((s) => s.expandAll)
  const collapseAllAction = useStore((s) => s.collapseAll)

  const matchedSet = useMemo(() => new Set(matchedIds), [matchedIds])

  const flatNodes = useMemo(() => {
    if (!parsedTree) return []
    return flattenTree(parsedTree, expandedIds, matchedSet)
  }, [parsedTree, expandedIds, matchedSet])

  const expandAll = useMemo(() => {
    return () => {
      if (!parsedTree) return
      const allIds: string[] = []
      const collect = (node: TreeNode): void => {
        if ((node.children && node.children.length > 0) || isTruncatedNode(node)) {
          allIds.push(node.id)
          node.children?.forEach(collect)
        }
      }
      collect(parsedTree)
      expandAllAction(allIds)
    }
  }, [parsedTree, expandAllAction])

  const findTruncatedNode = useCallback((id: string): TreeNode | null => {
    if (!parsedTree) return null
    const find = (node: TreeNode): TreeNode | null => {
      if (node.id === id && isTruncatedNode(node)) {
        return node
      }
      if (node.children) {
        for (const child of node.children) {
          const found = find(child)
          if (found) return found
        }
      }
      return null
    }
    return find(parsedTree)
  }, [parsedTree])

  return {
    flatNodes,
    toggleNode: toggleExpanded,
    expandAll,
    collapseAll: collapseAllAction,
    findTruncatedNode
  }
}
