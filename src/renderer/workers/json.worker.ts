interface TreeNode {
  id: string
  key: string | number
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: TreeNode[]
  depth: number
  path: string
}

interface WorkerMessage {
  id: number
  action: 'parse' | 'format' | 'minify' | 'validate' | 'expandNode'
  payload: string
  indent?: number
  nodeId?: string
  nodeValue?: unknown
  nodePath?: string
  nodeDepth?: number
}

interface ParseResult {
  tree: TreeNode | null
  errors: Array<{ line: number; column: number; message: string }>
  allIds: string[]
}

interface ExpandResult {
  nodeId: string
  children: TreeNode[]
  childIds: string[]
}

function getType(value: unknown): TreeNode['type'] {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as TreeNode['type']
}

let nodeCounter = 0

function buildTree(
  key: string | number,
  value: unknown,
  depth: number,
  parentPath: string,
  maxDepth: number
): TreeNode {
  const id = `node_${nodeCounter++}`
  const path = parentPath ? (typeof key === 'number' ? `${parentPath}[${key}]` : `${parentPath}.${key}`) : '$'
  const type = getType(value)

  const node: TreeNode = { id, key, value: undefined, type, depth, path }

  // Mark if node is truncated (has data but not expanded due to depth limit)
  const isTruncated = depth >= maxDepth && (type === 'object' || type === 'array')

  if (type === 'object' && value !== null) {
    if (depth < maxDepth) {
      node.children = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        buildTree(k, v, depth + 1, path, maxDepth)
      )
    } else {
      // Store raw value for lazy expansion, mark as truncated
      node.value = value
      // Create placeholder to indicate there's data
      const objValue = value as Record<string, unknown>
      const keyCount = Object.keys(objValue).length
      node.children = keyCount > 0 ? undefined : [] // undefined means truncated with data
    }
  } else if (type === 'array') {
    if (depth < maxDepth) {
      node.children = (value as unknown[]).map((item, i) =>
        buildTree(i, item, depth + 1, path, maxDepth)
      )
    } else {
      node.value = value
      const arrValue = value as unknown[]
      node.children = arrValue.length > 0 ? undefined : []
    }
  } else {
    node.value = value
  }

  return node
}

function collectIds(node: TreeNode): string[] {
  const ids = [node.id]
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectIds(child))
    }
  }
  return ids
}

function parse(text: string): ParseResult {
  nodeCounter = 0
  try {
    const t0 = performance.now()
    const data = JSON.parse(text)
    const t1 = performance.now()
    // For large files, limit initial parse depth
    const sizeEstimate = text.length
    const maxDepth = sizeEstimate > 1_000_000 ? 5 : sizeEstimate > 100_000 ? 8 : 100
    const tree = buildTree('root', data, 0, '', maxDepth)
    const t2 = performance.now()
    const allIds = collectIds(tree)
    const t3 = performance.now()
    console.log(`[Worker] JSON.parse: ${(t1-t0).toFixed(1)}ms, buildTree: ${(t2-t1).toFixed(1)}ms, collectIds: ${(t3-t2).toFixed(1)}ms`)
    return { tree, errors: [], allIds }
  } catch (e) {
    const err = e as SyntaxError
    const match = err.message.match(/position\s+(\d+)/)
    const pos = match ? parseInt(match[1]) : 0

    // Calculate line and column from position
    let line = 1
    let column = 1
    for (let i = 0; i < pos && i < text.length; i++) {
      if (text[i] === '\n') {
        line++
        column = 1
      } else {
        column++
      }
    }

    return {
      tree: null,
      errors: [{ line, column, message: err.message }],
      allIds: []
    }
  }
}

function format(text: string, indent = 2): string {
  const data = JSON.parse(text)
  return JSON.stringify(data, null, indent)
}

function minify(text: string): string {
  const data = JSON.parse(text)
  return JSON.stringify(data)
}

function validate(text: string): { valid: boolean; errors: Array<{ line: number; column: number; message: string }> } {
  try {
    JSON.parse(text)
    return { valid: true, errors: [] }
  } catch (e) {
    const err = e as SyntaxError
    const match = err.message.match(/position\s+(\d+)/)
    const pos = match ? parseInt(match[1]) : 0
    let line = 1
    let column = 1
    for (let i = 0; i < pos && i < text.length; i++) {
      if (text[i] === '\n') {
        line++
        column = 1
      } else {
        column++
      }
    }
    return { valid: false, errors: [{ line, column, message: err.message }] }
  }
}

function expandNode(nodeId: string, nodeValue: unknown, nodePath: string, nodeDepth: number): ExpandResult {
  const type = getType(nodeValue)
  const children: TreeNode[] = []

  // Expand one more level (depth + 2 to allow expanding children)
  const expansionDepth = 2

  if (type === 'object' && nodeValue !== null) {
    Object.entries(nodeValue as Record<string, unknown>).forEach(([k, v]) => {
      children.push(buildTree(k, v, nodeDepth + 1, nodePath, nodeDepth + 1 + expansionDepth))
    })
  } else if (type === 'array') {
    (nodeValue as unknown[]).forEach((item, i) => {
      children.push(buildTree(i, item, nodeDepth + 1, nodePath, nodeDepth + 1 + expansionDepth))
    })
  }

  const childIds: string[] = []
  for (const child of children) {
    childIds.push(...collectIds(child))
  }

  return { nodeId, children, childIds }
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, action, payload, indent, nodeId, nodeValue, nodePath, nodeDepth } = e.data

  try {
    switch (action) {
      case 'parse': {
        const result = parse(payload)
        self.postMessage({ id, action, result })
        break
      }
      case 'format': {
        const result = format(payload, indent)
        self.postMessage({ id, action, result })
        break
      }
      case 'minify': {
        const result = minify(payload)
        self.postMessage({ id, action, result })
        break
      }
      case 'validate': {
        const result = validate(payload)
        self.postMessage({ id, action, result })
        break
      }
      case 'expandNode': {
        if (nodeId && nodeValue !== undefined && nodePath !== undefined && nodeDepth !== undefined) {
          const result = expandNode(nodeId, nodeValue, nodePath, nodeDepth)
          self.postMessage({ id, action, result })
        }
        break
      }
    }
  } catch (err) {
    self.postMessage({
      id,
      action,
      error: (err as Error).message
    })
  }
}
