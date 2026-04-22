export interface TreeNode {
  id: string
  key: string | number
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: TreeNode[]
  depth: number
  path: string
}

export interface FlatNode extends TreeNode {
  hasChildren: boolean
  expanded: boolean
  highlighted: boolean
}

export interface ValidationError {
  line: number
  column: number
  message: string
}

export interface SearchOptions {
  caseSensitive: boolean
  regex: boolean
  searchKeys: boolean
  searchValues: boolean
}

export interface JsonSlice {
  rawText: string
  parsedTree: TreeNode | null
  validationErrors: ValidationError[]
  expandedIds: Set<string>
  syncSource: 'editor' | 'tree' | null

  setRawText: (text: string, source?: 'editor' | 'tree') => void
  setParsedTree: (tree: TreeNode | null) => void
  setValidationErrors: (errors: ValidationError[]) => void
  toggleExpanded: (id: string) => void
  expandAll: (ids: string[]) => void
  collapseAll: () => void
  setSyncSource: (source: 'editor' | 'tree' | null) => void
  updateNodeChildren: (nodeId: string, children: TreeNode[], childIds: string[]) => void
}

export interface UiSlice {
  theme: 'dark' | 'light'
  searchQuery: string
  searchOptions: SearchOptions
  matchedIds: string[]
  currentMatchIndex: number
  toastMessage: string | null
  toastType: 'success' | 'error' | null
  isLoading: boolean
  loadingMessage: string | null
  loadingProgress: number

  toggleTheme: () => void
  setSearchQuery: (query: string) => void
  setSearchOptions: (options: Partial<SearchOptions>) => void
  setMatchedIds: (ids: string[]) => void
  navigateMatch: (direction: 'next' | 'prev') => void
  showToast: (message: string, type: 'success' | 'error') => void
  clearToast: () => void
  setLoading: (isLoading: boolean, message?: string) => void
  setLoadingProgress: (progress: number) => void
}

export type StoreState = JsonSlice & UiSlice
