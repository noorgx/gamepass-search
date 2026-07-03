function isNew(added_date) {
  if (!added_date) return false
  const d = new Date(added_date)
  return (Date.now() - d.getTime()) < 30 * 86400000
}

function isLeavingSoon(leaving_date) {
  if (!leaving_date) return false
  const d = new Date(leaving_date)
  return d.getTime() - Date.now() < 30 * 86400000 && d.getTime() > Date.now()
}

const TIER_COLORS = { Essential: '#0063b1', Standard: '#5c2d91', Premium: '#107c10' }

export default function GameCard({ game, onSelect }) {
  const platforms = JSON.parse(game.platforms || '[]')
  const leaving = isLeavingSoon(game.leaving_date)
  const newGame = isNew(game.added_date)

  return (
    <div
      onClick={() => onSelect(game)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ height: 120, background: '#1e1e2e', position: 'relative', overflow: 'hidden' }}>
        {game.image_url
          ? <img src={game.image_url} alt={game.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎮</div>
        }
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
          {newGame && <span style={{ background: 'var(--accent-new)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>NEW</span>}
          {leaving && <span style={{ background: 'var(--accent-leaving)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>LEAVING SOON</span>}
        </div>
      </div>
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{game.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {game.metacritic != null && (
            <span style={{ background: '#2a2a3a', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 700, color: game.metacritic >= 75 ? '#4caf50' : game.metacritic >= 50 ? '#ff9800' : '#f44336' }}>
              {game.metacritic}
            </span>
          )}
          {game.tier && (
            <span style={{ background: TIER_COLORS[game.tier] || '#333', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
              {game.tier}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
          {platforms.map(p => (
            <span key={p} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 4, padding: '2px 5px' }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
