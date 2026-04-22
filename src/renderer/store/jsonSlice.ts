import type { StateCreator } from 'zustand'
import type { StoreState, JsonSlice, TreeNode } from './types'

function updateNodeChildrenInTree(tree: TreeNode, nodeId: string, children: TreeNode[]): TreeNode {
  if (tree.id === nodeId) {
    return { ...tree, children, value: undefined }
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => updateNodeChildrenInTree(child, nodeId, children))
    }
  }
  return tree
}

export const createJsonSlice: StateCreator<StoreState, [['zustand/subscribeWithSelector', never]], [], JsonSlice> = (set) => ({
  rawText: '',
  parsedTree: null,
  validationErrors: [],
  expandedIds: new Set<string>(),
  syncSource: null,

  setRawText: (text, source = null) =>
    set({ rawText: text, syncSource: source }),

  setParsedTree: (tree) => set({ parsedTree: tree }),

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { expandedIds: next }
    }),

  expandAll: (ids) => set({ expandedIds: new Set(ids) }),

  collapseAll: () => set({ expandedIds: new Set<string>() }),

  setSyncSource: (source) => set({ syncSource: source }),

  updateNodeChildren: (nodeId, children, childIds) =>
    set((state) => {
      if (!state.parsedTree) return state
      const newTree = updateNodeChildrenInTree(state.parsedTree, nodeId, children)
      const newExpandedIds = new Set(state.expandedIds)
      newExpandedIds.add(nodeId)
      return { parsedTree: newTree, expandedIds: newExpandedIds }
    })
})
