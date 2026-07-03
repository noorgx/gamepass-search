import { useEffect } from 'react'

function MetaRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: "'VT323', monospace",
        fontSize: 14,
        fontWeight: 400,
        color: 'var(--body-subtle)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: 'var(--heading)', lineHeight: 1.4 }}>
        {value}
      </div>
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
        background: 'rgba(10,1,24,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 40, padding: 32,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={game.title}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--neutral-primary)',
          border: '2px solid var(--border-default)',
          borderRadius: 0,
          width: '100%',
          maxWidth: 600,
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: 'var(--brand-ring-shadow)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: "'VT323', monospace",
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--heading)',
            lineHeight: 1.1,
            flex: 1,
          }}>
            {game.title}
          </h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: '0.4em 1em', fontSize: 16, flexShrink: 0, border: '2px solid var(--border-default)' }}
          >
            Close
          </button>
        </div>

        {/* Hero image */}
        {game.image_url && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={game.image_url}
              alt={game.title}
              style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, var(--neutral-primary) 0%, transparent 50%)',
            }} />
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '24px 24px 28px' }}>
          {game.description && (
            <p style={{
              fontFamily: "'VT323', monospace",
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--body)',
              marginBottom: 24,
            }}>
              {game.description}
            </p>
          )}

          <div style={{
            borderTop: '2px solid var(--border-default)',
            paddingTop: 20,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 32px',
          }}>
            <MetaRow label="Developer" value={game.developer} />
            <MetaRow label="Publisher" value={game.publisher} />
            <MetaRow label="Release Year" value={game.release_year} />
            <MetaRow label="Metacritic" value={game.metacritic} />
            <MetaRow label="Genre" value={genre} />
            <MetaRow label="Tier" value={game.tier} />
            <MetaRow label="Platforms" value={platforms} />
            <MetaRow label="Multiplayer" value={multiplayer} />
            <MetaRow label="Date Added" value={game.added_date} />
            <MetaRow label="Leaving" value={game.leaving_date} />
          </div>
        </div>
      </div>
    </div>
  )
}
