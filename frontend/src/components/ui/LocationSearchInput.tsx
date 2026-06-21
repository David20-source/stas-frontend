import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import { searchUgandaLocations, type LocationSuggestion } from '../../api/nominatim'
import { UGANDA_CITIES } from '../../utils/ugandaRoutes'

type Props = {
  label: string
  placeholder?: string
  value: string
  pinColor?: string
  onSelect: (suggestion: LocationSuggestion) => void
  onClear?: () => void
}

/** Debounce hook */
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

/** City quick-picks as LocationSuggestion format */
const CITY_SUGGESTIONS: LocationSuggestion[] = UGANDA_CITIES.map((c, i) => ({
  id:       `city-${i}`,
  label:    c.name,
  fullName: `${c.name}, Uganda`,
  coords:   c.coords,
}))

export default function LocationSearchInput({
  label,
  placeholder = 'Search any location in Uganda…',
  value,
  pinColor = 'var(--accent-primary)',
  onSelect,
  onClear,
}: Props) {
  const [query,       setQuery]       = useState(value)
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [results,     setResults]     = useState<LocationSuggestion[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 380)

  // Sync external value changes (e.g. after "Use my location" or map pin)
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Fetch from Nominatim when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery === value) {
      setResults([])
      setLoading(false)
      return
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)

    searchUgandaLocations(debouncedQuery, abortRef.current.signal)
      .then((r) => { setResults(r); setLoading(false) })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setLoading(false)
        setResults([])
      })
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(s: LocationSuggestion) {
    setQuery(s.label)
    setOpen(false)
    setResults([])
    onSelect(s)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
    onClear?.()
    inputRef.current?.focus()
  }

  // Show city quick-picks when input is focused with no query
  const showCities = open && !query.trim()
  const showResults = open && (results.length > 0 || loading)
  const displayList = showCities
    ? CITY_SUGGESTIONS.slice(0, 8)
    : results

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label */}
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>

      {/* Input row */}
      <div
        className="flex items-center gap-2 h-11 px-3 rounded-lg border transition-colors"
        style={{
          background:   'var(--bg-secondary)',
          borderColor:  open ? 'var(--border-primary)' : 'var(--border-subtle)',
          boxShadow:    open ? 'var(--shadow-glow-cyan)' : 'none',
        }}
      >
        {loading
          ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          : <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button type="button" onClick={handleClear}
            className="shrink-0 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-tertiary)' }}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(showCities || showResults) && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border overflow-hidden shadow-lg"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          {showCities && (
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}>
                Major Cities &amp; Towns in Uganda
              </span>
            </div>
          )}
          {displayList.length === 0 && loading && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Searching Uganda…
            </div>
          )}
          {displayList.length === 0 && !loading && query.trim() && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No results found. Try a different name.
            </div>
          )}
          {displayList.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-colors border-b last:border-0"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'transparent',
              }}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
            >
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: pinColor }} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {s.label}
                </div>
                {s.fullName !== s.label && (
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {s.fullName}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
