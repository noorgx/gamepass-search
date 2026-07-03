import { useState } from 'react'

const DEFAULT_FILTERS = {
  q: '',
  genre: [],
  platform: [],
  multiplayer: [],
  tier: [],
  yearMin: '',
  yearMax: '',
  metaMin: '',
  metaMax: '',
  newOnly: false,
  leavingSoon: false,
}

export function useFilters() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return { filters, updateFilter, resetFilters }
}
