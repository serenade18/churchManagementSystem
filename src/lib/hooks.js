import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/** Fetch `path` with `params`, refetching whenever they change. */
export function useApi(path, params) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify(params || {})

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    try {
      setData(await api.get(path, JSON.parse(key)))
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [path, key])

  useEffect(() => { reload() }, [reload])
  return { data, error, loading, reload, setData }
}

/** Debounce a fast-changing value (e.g. search input). */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** Branch / project options for select inputs (fetched once, all pages). */
export function useOptions(path) {
  const { data } = useApi(path, { page_size: 500 })
  return data?.results || []
}
