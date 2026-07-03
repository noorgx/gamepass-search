import { useState } from 'react'
import Header from './components/Header'
import FilterSidebar from './components/FilterSidebar'
import GameGrid from './components/GameGrid'
import GameModal from './components/GameModal'
import { useFilters } from './hooks/useFilters'
import { useGames } from './hooks/useGames'

export default function App() {
  const { filters, updateFilter, cycleFilter, resetFilters } = useFilters()
  const [syncVersion, setSyncVersion]   = useState(0)
  const [enrichKey,   setEnrichKey]     = useState(0)
  const { games, total, loading, page, setPage, LIMIT } = useGames(filters, syncVersion)
  const [selectedGame, setSelectedGame] = useState(null)

  function onSyncComplete()   { setSyncVersion(v => v + 1) }
  function onEnrichComplete() { setSyncVersion(v => v + 1); setEnrichKey(k => k + 1) }

  return (
    <div className="app">
      <Header
        total={total}
        onSyncComplete={onSyncComplete}
        onEnrichComplete={onEnrichComplete}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <FilterSidebar
          filters={filters}
          updateFilter={updateFilter}
          cycleFilter={cycleFilter}
          onReset={resetFilters}
          enrichKey={enrichKey}
        />
        <GameGrid
          games={games}
          total={total}
          loading={loading}
          page={page}
          limit={LIMIT}
          onPageChange={setPage}
          onSelect={setSelectedGame}
          filters={filters}
          onFilterChange={updateFilter}
        />
      </div>
      {selectedGame && (
        <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  )
}
