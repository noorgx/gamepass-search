import { useState } from 'react'

const DEFAULT_FILTERS = {
  q: '',
  // include lists
  genreTag:    [],
  platform:    [],
  multiplayer: [],
  tier:        [],
  // exclude lists
  genreTagExclude:    [],
  platformExclude:    [],
  multiplayerExclude: [],
  tierExclude:        [],
  // range
  yearMin:  '',
  yearMax:  '',
  metaMin:  '',
  metaMax:  '',
  // toggles
  newOnly:     false,
  leavingSoon: false,
}

export function useFilters() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Cycle an item through: neutral → include → exclude → neutral
  // Modifies both the include key and its paired exclude key.
  function cycleFilter(includeKey, excludeKey, value) {
    setFilters(prev => {
      const inInclude = prev[includeKey].includes(value)
      const inExclude = prev[excludeKey].includes(value)

      if (!inInclude && !inExclude) {
        // neutral → include
        return { ...prev, [includeKey]: [...prev[includeKey], value] }
      } else if (inInclude) {
        // include → exclude
        return {
          ...prev,
          [includeKey]: prev[includeKey].filter(v => v !== value),
          [excludeKey]: [...prev[excludeKey], value],
        }
      } else {
        // exclude → neutral
        return { ...prev, [excludeKey]: prev[excludeKey].filter(v => v !== value) }
      }
    })
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return { filters, updateFilter, cycleFilter, resetFilters }
}
