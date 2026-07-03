import GameCard from './GameCard'

export default function GameGrid({ games, total, loading, page, limit, onPageChange, onSelect, filters, onFilterChange }) {
  const totalPages = Math.ceil(total / limit)

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--neutral-primary)' }}>
      {/* Search bar */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '2px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: 'var(--neutral-primary-soft)',
        flexShrink: 0,
      }}>
        <input
          className="input"
          type="text"
          placeholder="Search games"
          value={filters.q}
          onChange={e => onFilterChange('q', e.target.value)}
          style={{ flex: 1, maxWidth: 360 }}
        />
        <span style={{
          fontFamily: "'VT323', monospace",
          fontSize: 16,
          color: 'var(--body-subtle)',
          whiteSpace: 'nowrap',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          {loading ? 'Loading' : `${total} Game${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Card grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {loading && games.length === 0 ? (
          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 24,
            color: 'var(--body-subtle)',
            textAlign: 'center',
            marginTop: 80,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            Loading...
          </div>
        ) : games.length === 0 ? (
          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 24,
            color: 'var(--body-subtle)',
            textAlign: 'center',
            marginTop: 80,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            No games match your filters
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 36,
          }}>
            {games.map(game => (
              <GameCard key={game.id} game={game} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '14px 24px',
          borderTop: '2px solid var(--border-default)',
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--neutral-primary-soft)',
          flexShrink: 0,
        }}>
          <button
            className="btn-page btn-page-label"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            Prev
          </button>

          {/* Nearby pages */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = Math.max(0, Math.min(page - 2 + i, totalPages - 5 + i))
            return p
          }).filter((p, i, arr) => arr.indexOf(p) === i && p >= 0 && p < totalPages).map(p => (
            <button
              key={p}
              className={`btn-page${p === page ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          ))}

          <button
            className="btn-page btn-page-label"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}
