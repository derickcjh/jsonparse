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
  action: 'parse' | 'format' | 'minify' | 'validate'
  payload: string
  indent?: number
}

interface ParseResult {
  tree: TreeNode | null
  errors: Array<{ line: number; column: number; message: string }>
  allIds: string[]
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

  if (type === 'object' && value !== null) {
    if (depth < maxDepth) {
      node.children = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        buildTree(k, v, depth + 1, path, maxDepth)
      )
    } else {
      // Store raw value for lazy expansion
      node.value = value
      node.children = []
    }
  } else if (type === 'array') {
    if (depth < maxDepth) {
      node.children = (value as unknown[]).map((item, i) =>
        buildTree(i, item, depth + 1, path, maxDepth)
      )
    } else {
      node.value = value
      node.children = []
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
    const data = JSON.parse(text)
    // For large files, limit initial parse depth
    const sizeEstimate = text.length
    const maxDepth = sizeEstimate > 1_000_000 ? 2 : sizeEstimate > 100_000 ? 4 : 100
    const tree = buildTree('root', data, 0, '', maxDepth)
    const allIds = collectIds(tree)
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

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, action, payload, indent } = e.data

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
    }
  } catch (err) {
    self.postMessage({
      id,
      action,
      error: (err as Error).message
    })
  }
}
