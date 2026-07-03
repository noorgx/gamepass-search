import { useState, useEffect } from 'react'

const API = 'http://localhost:3847'
export const LIMIT = 50

export function useGames(filters) {
  const [games, setGames] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)

  // Reset to first page when filters change
  useEffect(() => { setPage(0) }, [JSON.stringify(filters)])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const p = new URLSearchParams()
        if (filters.q) p.set('q', filters.q)
        if (filters.genre.length) p.set('genre', filters.genre.join(','))
        if (filters.platform.length) p.set('platform', filters.platform.join(','))
        if (filters.multiplayer.length) p.set('multiplayer', filters.multiplayer.join(','))
        if (filters.tier.length) p.set('tier', filters.tier.join(','))
        if (filters.yearMin) p.set('yearMin', filters.yearMin)
        if (filters.yearMax) p.set('yearMax', filters.yearMax)
        if (filters.metaMin) p.set('metaMin', filters.metaMin)
        if (filters.metaMax) p.set('metaMax', filters.metaMax)
        if (filters.newOnly) p.set('newOnly', 'true')
        if (filters.leavingSoon) p.set('leavingSoon', 'true')
        p.set('limit', LIMIT)
        p.set('offset', page * LIMIT)

        const res = await fetch(`${API}/api/games?${p}`)
        const data = await res.json()
        if (!cancelled) { setGames(data.games); setTotal(data.total) }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [JSON.stringify(filters), page])

  return { games, total, loading, error, page, setPage, LIMIT }
}
