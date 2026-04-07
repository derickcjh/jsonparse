import { useMemo } from 'react'
import { useStore } from '../store'
import type { TreeNode, FlatNode } from '../store/types'

function flattenTree(
  node: TreeNode,
  expandedIds: Set<string>,
  matchedIds: Set<string>
): FlatNode[] {
  const hasChildren = !!(node.children && node.children.length > 0)
  const expanded = expandedIds.has(node.id)
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
        if (node.children && node.children.length > 0) {
          allIds.push(node.id)
          node.children.forEach(collect)
        }
      }
      collect(parsedTree)
      expandAllAction(allIds)
    }
  }, [parsedTree, expandAllAction])

  return {
    flatNodes,
    toggleNode: toggleExpanded,
    expandAll,
    collapseAll: collapseAllAction
  }
}
