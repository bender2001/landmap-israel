import { useState, useCallback, useMemo } from 'react'

export default function usePagination({ defaultLimit = 25 } = {}) {
  const [page, setPage] = useState(1)
  const [limit] = useState(defaultLimit)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = useCallback((column) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('desc')
      return column
    })
    setPage(1)
  }, [])

  const params = useMemo(() => ({
    page,
    limit,
    sort_by: sortBy,
    sort_dir: sortDir,
  }), [page, limit, sortBy, sortDir])

  return {
    page,
    setPage,
    limit,
    sortBy,
    sortDir,
    handleSort,
    params,
  }
}
