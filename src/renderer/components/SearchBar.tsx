import { useCallback, useEffect, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, CaseSensitive, Regex } from 'lucide-react'
import { useStore } from '../store'
import { useSearchWorker } from '../hooks/useSearchWorker'
import { IconButton } from './common/IconButton'

export function SearchBar(): JSX.Element {
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const searchOptions = useStore((s) => s.searchOptions)
  const setSearchOptions = useStore((s) => s.setSearchOptions)
  const matchedIds = useStore((s) => s.matchedIds)
  const currentMatchIndex = useStore((s) => s.currentMatchIndex)
  const navigateMatch = useStore((s) => s.navigateMatch)

  const { search } = useSearchWorker()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Use refs for values used inside the debounced search to avoid dependency churn
  const searchOptionsRef = useRef(searchOptions)
  searchOptionsRef.current = searchOptions

  const doSearch = useCallback(
    (query: string) => {
      const store = useStore.getState()
      const tree = store.parsedTree
      if (!query || !tree) {
        store.setMatchedIds([])
        return
      }
      search(tree, query, searchOptionsRef.current).then(({ matchIds }) => {
        useStore.getState().setMatchedIds(matchIds)
      })
    },
    [search]
  )

  // Debounced search trigger
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, searchOptions, doSearch])

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <Search size={14} className="text-gray-400 flex-shrink-0" />
      <input
        className="flex-1 min-w-0 px-1 py-0.5 text-xs bg-transparent outline-none placeholder-gray-400"
        placeholder="搜索 JSON..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.shiftKey ? navigateMatch('prev') : navigateMatch('next')
          }
        }}
      />

      {matchedIds.length > 0 && (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {currentMatchIndex + 1}/{matchedIds.length}
        </span>
      )}

      <IconButton
        icon={<ChevronUp size={14} />}
        label="上一个"
        onClick={() => navigateMatch('prev')}
        disabled={matchedIds.length === 0}
      />
      <IconButton
        icon={<ChevronDown size={14} />}
        label="下一个"
        onClick={() => navigateMatch('next')}
        disabled={matchedIds.length === 0}
      />

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

      <IconButton
        icon={<CaseSensitive size={14} />}
        label="区分大小写"
        active={searchOptions.caseSensitive}
        onClick={() => setSearchOptions({ caseSensitive: !searchOptions.caseSensitive })}
      />
      <IconButton
        icon={<Regex size={14} />}
        label="正则表达式"
        active={searchOptions.regex}
        onClick={() => setSearchOptions({ regex: !searchOptions.regex })}
      />
    </div>
  )
}
