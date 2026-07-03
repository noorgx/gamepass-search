import { useState } from 'react'
import Header from './components/Header'
import FilterSidebar from './components/FilterSidebar'
import GameGrid from './components/GameGrid'
import GameModal from './components/GameModal'
import { useFilters } from './hooks/useFilters'
import { useGames } from './hooks/useGames'

export default function App() {
  const { filters, updateFilter, resetFilters } = useFilters()
  const [syncVersion, setSyncVersion] = useState(0)
  const { games, total, loading, page, setPage, LIMIT } = useGames(filters, syncVersion)
  const [selectedGame, setSelectedGame] = useState(null)

  return (
    <div className="app">
      <Header total={total} onSyncComplete={() => setSyncVersion(v => v + 1)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <FilterSidebar filters={filters} onUpdate={updateFilter} onReset={resetFilters} />
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
