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
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 dark:bg-void-100/80 border-b border-slate-200/60 dark:border-slate-700/40">
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-void-200/50 border border-slate-200/80 dark:border-slate-700/50 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
        <Search size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <input
          className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-200"
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
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
            {currentMatchIndex + 1} / {matchedIds.length}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5">
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
      </div>

      <div className="w-px h-5 bg-slate-200/60 dark:bg-slate-700/40" />

      <div className="flex items-center gap-0.5">
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
    </div>
  )
}
