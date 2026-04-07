import { useRef, useEffect, useCallback } from 'react'
import type { TreeNode, ValidationError } from '../store/types'

interface ParseResult {
  tree: TreeNode | null
  errors: ValidationError[]
  allIds: string[]
}

type Resolver = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

export function useJsonWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<number, Resolver>>(new Map())
  const idRef = useRef(0)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/json.worker.ts', import.meta.url),
      { type: 'module' }
    )

    workerRef.current.onmessage = (e) => {
      const { id, result, error } = e.data
      const pending = pendingRef.current.get(id)
      if (pending) {
        pendingRef.current.delete(id)
        if (error) {
          pending.reject(new Error(error))
        } else {
          pending.resolve(result)
        }
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const send = useCallback((action: string, payload: string, extra?: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const id = idRef.current++
      pendingRef.current.set(id, { resolve, reject })
      workerRef.current?.postMessage({ id, action, payload, ...extra })
    })
  }, [])

  const parse = useCallback(
    (text: string) => send('parse', text) as Promise<ParseResult>,
    [send]
  )

  const format = useCallback(
    (text: string, indent = 2) => send('format', text, { indent }) as Promise<string>,
    [send]
  )

  const minify = useCallback(
    (text: string) => send('minify', text) as Promise<string>,
    [send]
  )

  const validate = useCallback(
    (text: string) =>
      send('validate', text) as Promise<{ valid: boolean; errors: ValidationError[] }>,
    [send]
  )

  return { parse, format, minify, validate }
}
