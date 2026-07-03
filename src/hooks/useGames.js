import { useState, useEffect } from 'react'

export function useGames(filters) {
  const [games, setGames] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const LIMIT = 20

  useEffect(() => {
    // Placeholder for actual API call
    setLoading(false)
  }, [filters, page])

  return { games, total, loading, page, setPage, LIMIT }
}
