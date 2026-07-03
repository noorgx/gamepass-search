import { useEffect } from 'react'

function Row({ label, value }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  )
}

export default function GameModal({ game, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!game) return null

  const genre = JSON.parse(game.genre || '[]').join(', ')
  const platforms = JSON.parse(game.platforms || '[]').join(', ')
  const multiplayer = JSON.parse(game.multiplayer || '[]').join(', ')

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10,
          width: '100%', maxWidth: 560, maxHeight: '85vh',
          overflowY: 'auto', padding: 28,
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, flex: 1 }}>{game.title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 20, padding: '0 4px', marginLeft: 12 }}>✕</button>
        </div>

        {game.image_url && (
          <img src={game.image_url} alt={game.title}
            style={{ width: '100%', borderRadius: 6, marginBottom: 18, maxHeight: 200, objectFit: 'cover' }} />
        )}

        {game.description && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 20 }}>
            {game.description}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Row label="Developer" value={game.developer} />
          <Row label="Publisher" value={game.publisher} />
          <Row label="Release Year" value={game.release_year} />
          <Row label="Metacritic" value={game.metacritic} />
          <Row label="Genre" value={genre} />
          <Row label="Tier" value={game.tier} />
          <Row label="Platforms" value={platforms} />
          <Row label="Multiplayer" value={multiplayer} />
          <Row label="Added" value={game.added_date} />
          <Row label="Leaving" value={game.leaving_date} />
        </div>
      </div>
    </div>
  )
}
