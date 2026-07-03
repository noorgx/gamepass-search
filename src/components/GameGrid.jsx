import GameCard from './GameCard'

export default function GameGrid({ games, total, loading, page, limit, onPageChange, onSelect, filters, onFilterChange }) {
  const totalPages = Math.ceil(total / limit)

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          placeholder="Search games…"
          value={filters.q}
          onChange={e => onFilterChange('q', e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${total} game${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading && games.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>Loading…</div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>No games match your filters.</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {games.map(game => (
              <GameCard key={game.id} game={game} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 0} style={{ background: '#333' }}>← Prev</button>
          <span style={{ lineHeight: '30px', fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} style={{ background: '#333' }}>Next →</button>
        </div>
      )}
    </main>
  )
}
