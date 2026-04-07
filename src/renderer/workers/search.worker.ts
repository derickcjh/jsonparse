interface TreeNode {
  id: string
  key: string | number
  value: unknown
  type: string
  children?: TreeNode[]
  path: string
}

interface SearchMessage {
  id: number
  action: 'search'
  tree: TreeNode
  query: string
  options: {
    caseSensitive: boolean
    regex: boolean
    searchKeys: boolean
    searchValues: boolean
  }
}

function searchTree(
  node: TreeNode,
  matcher: (text: string) => boolean,
  searchKeys: boolean,
  searchValues: boolean
): string[] {
  const matches: string[] = []

  if (searchKeys && matcher(String(node.key))) {
    matches.push(node.id)
  } else if (
    searchValues &&
    node.type !== 'object' &&
    node.type !== 'array' &&
    matcher(String(node.value))
  ) {
    matches.push(node.id)
  }

  if (node.children) {
    for (const child of node.children) {
      matches.push(...searchTree(child, matcher, searchKeys, searchValues))
    }
  }

  return matches
}

self.onmessage = (e: MessageEvent<SearchMessage>) => {
  const { id, tree, query, options } = e.data

  if (!query || !tree) {
    self.postMessage({ id, matchIds: [], matchCount: 0 })
    return
  }

  let matcher: (text: string) => boolean

  if (options.regex) {
    try {
      const flags = options.caseSensitive ? '' : 'i'
      const re = new RegExp(query, flags)
      matcher = (text) => re.test(text)
    } catch {
      self.postMessage({ id, matchIds: [], matchCount: 0 })
      return
    }
  } else {
    const q = options.caseSensitive ? query : query.toLowerCase()
    matcher = (text) => {
      const t = options.caseSensitive ? text : text.toLowerCase()
      return t.includes(q)
    }
  }

  const matchIds = searchTree(tree, matcher, options.searchKeys, options.searchValues)
  self.postMessage({ id, matchIds, matchCount: matchIds.length })
}
