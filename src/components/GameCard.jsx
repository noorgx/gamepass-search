function isNew(added_date) {
  if (!added_date) return false
  return (Date.now() - new Date(added_date).getTime()) < 30 * 86400000
}

function isLeavingSoon(leaving_date) {
  if (!leaving_date) return false
  const t = new Date(leaving_date).getTime()
  return t > Date.now() && t - Date.now() < 30 * 86400000
}

const API = 'http://localhost:3847'

function thumbnailUrl(image_url) {
  if (!image_url) return null
  return `${API}/api/images?url=${encodeURIComponent(image_url)}&w=220&h=140`
}

// Design system badge: 0px radius, 2px border, VT323 uppercase
function Badge({ children, bg, borderColor, textColor }) {
  return (
    <span style={{
      fontFamily: "'VT323', monospace",
      fontSize: 14,
      fontWeight: 400,
      background: bg,
      border: `2px solid ${borderColor}`,
      color: textColor,
      padding: '2px 8px',
      borderRadius: 0,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      lineHeight: 1.5,
    }}>
      {children}
    </span>
  )
}

const TIER_LABELS = { Essential: 'Essential', Standard: 'Standard', Premium: 'Premium' }

// Maps every tag to { bg, border, text } using design-system tokens
const TAG_STYLES = {
  // Genre
  Action:      { bg:'var(--brand-softer)',           border:'var(--brand)',             text:'var(--fg-brand-strong)' },
  Adventure:   { bg:'var(--secondary-brand-softer)', border:'var(--secondary-brand)',   text:'var(--fg-purple-strong)' },
  RPG:         { bg:'var(--tertiary-brand-softer)',  border:'var(--tertiary-brand)',    text:'var(--tertiary-brand-strong)' },
  Shooter:     { bg:'var(--danger-soft)',            border:'var(--danger)',            text:'var(--fg-danger-strong)' },
  Strategy:    { bg:'var(--quaternary-brand-softer)',border:'var(--quaternary-brand)',  text:'var(--quaternary-brand-strong)' },
  Sports:      { bg:'var(--success-soft)',           border:'var(--success)',           text:'var(--fg-success-strong)' },
  Racing:      { bg:'var(--warning-soft)',           border:'var(--warning)',           text:'var(--fg-warning)' },
  Horror:      { bg:'var(--danger-soft)',            border:'var(--danger)',            text:'var(--fg-danger)' },
  Survival:    { bg:'var(--warning-soft)',           border:'var(--warning)',           text:'var(--fg-warning)' },
  Simulation:  { bg:'var(--quaternary-brand-softer)',border:'var(--quaternary-brand)',  text:'var(--quaternary-brand-strong)' },
  Platformer:  { bg:'var(--tertiary-brand-softer)',  border:'var(--tertiary-brand)',    text:'var(--tertiary-brand-strong)' },
  Fighting:    { bg:'var(--danger-soft)',            border:'var(--danger)',            text:'var(--fg-danger-strong)' },
  Puzzle:      { bg:'var(--secondary-brand-softer)', border:'var(--secondary-brand)',   text:'var(--fg-purple-strong)' },
  Indie:       { bg:'var(--neutral-primary-strong)', border:'var(--border-dark)',       text:'var(--body)' },
  Casual:      { bg:'var(--tertiary-brand-softer)',  border:'var(--tertiary-brand)',    text:'var(--tertiary-brand-strong)' },
  // Themes
  'Sci-fi':          { bg:'#0a1a2e', border:'#55E1FF', text:'#55E1FF' },
  Fantasy:           { bg:'#2e1a00', border:'#FFB900', text:'#FFB900' },
  Cyberpunk:         { bg:'#2e0020', border:'#FF55AA', text:'#FF55AA' },
  'Post-apocalyptic':{ bg:'#2e1000', border:'#FF9C55', text:'#FF9C55' },
  Anime:             { bg:'#2e001a', border:'#FF55AA', text:'#FF55AA' },
  Medieval:          { bg:'#1a1400', border:'#FFD913', text:'#FFD913' },
  Historical:        { bg:'var(--quaternary-brand-softer)', border:'var(--quaternary-brand)', text:'var(--quaternary-brand-strong)' },
  Space:             { bg:'#0a0a2e', border:'#55E1FF', text:'#55E1FF' },
  // Features
  'Open World':   { bg:'var(--tertiary-brand-softer)',  border:'var(--tertiary-brand)',  text:'var(--tertiary-brand-strong)' },
  Roguelike:      { bg:'#2e1000', border:'#FF9C55', text:'#FF9C55' },
  Metroidvania:   { bg:'var(--secondary-brand-softer)', border:'var(--secondary-brand)', text:'var(--fg-purple-strong)' },
  Stealth:        { bg:'var(--neutral-primary-strong)', border:'var(--border-dark)',      text:'var(--body)' },
  Crafting:       { bg:'var(--tertiary-brand-softer)',  border:'var(--tertiary-brand)',  text:'var(--tertiary-brand-strong)' },
  Sandbox:        { bg:'var(--warning-soft)',           border:'var(--warning)',          text:'var(--fg-warning)' },
  'Tower Defense':{ bg:'var(--quaternary-brand-softer)',border:'var(--quaternary-brand)',text:'var(--quaternary-brand-strong)' },
  'Battle Royale':{ bg:'var(--danger-soft)',            border:'var(--danger)',           text:'var(--fg-danger-strong)' },
  // Mood
  'Story Rich': { bg:'var(--secondary-brand-softer)', border:'var(--secondary-brand)', text:'var(--fg-purple-strong)' },
  Relaxing:     { bg:'var(--tertiary-brand-softer)',  border:'var(--tertiary-brand)',  text:'var(--tertiary-brand-strong)' },
  Dark:         { bg:'var(--neutral-primary-strong)', border:'#5C4F8A',               text:'#A09BC4' },
  Atmospheric:  { bg:'var(--quaternary-brand-softer)',border:'var(--quaternary-brand)',text:'var(--quaternary-brand-strong)' },
  Funny:        { bg:'var(--warning-soft)',           border:'var(--warning)',         text:'var(--fg-warning)' },
}
const DEFAULT_TAG_STYLE = { bg:'var(--neutral-primary-strong)', border:'var(--border-dark)', text:'var(--body)' }

// Keep old name for compatibility
const GENRE_COLORS = TAG_STYLES

export default function GameCard({ game, onSelect }) {
  const leaving = isLeavingSoon(game.leaving_date)
  const newGame = isNew(game.added_date)
  const thumb = thumbnailUrl(game.image_url)
  const genreTags = (() => { try { return JSON.parse(game.genre_tags || '[]') } catch { return [] } })()

  return (
    <div className="game-card" onClick={() => onSelect(game)}>
      {/* Thumbnail */}
      <div style={{
        position: 'relative',
        background: 'var(--neutral-primary)',
        aspectRatio: '16/10',
        overflow: 'hidden',
      }}>
        {thumb
          ? <img
              src={thumb}
              alt={game.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'VT323', monospace",
              color: 'var(--body-subtle)',
              fontSize: 14,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              No Image
            </div>
        }

        {/* Badges overlay */}
        {(newGame || leaving) && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
            {newGame && (
              <Badge
                bg="var(--brand-softer)"
                borderColor="var(--border-brand)"
                textColor="var(--fg-brand-strong)"
              >
                New
              </Badge>
            )}
            {leaving && (
              <Badge
                bg="var(--danger-soft)"
                borderColor="var(--border-danger)"
                textColor="var(--fg-danger-strong)"
              >
                Leaving
              </Badge>
            )}
          </div>
        )}

        {/* Tier badge — top right */}
        {game.tier && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <Badge
              bg="var(--brand-softer)"
              borderColor="var(--border-brand-subtle)"
              textColor="var(--fg-brand)"
            >
              {TIER_LABELS[game.tier] || game.tier}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontFamily: "'VT323', monospace",
          fontSize: 16,
          color: 'var(--heading)',
          lineHeight: 1.3,
          marginBottom: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {game.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {game.metacritic != null && (
            <span style={{
              fontFamily: "'VT323', monospace",
              fontSize: 13,
              color: game.metacritic >= 75
                ? 'var(--fg-success-strong)'
                : game.metacritic >= 50
                  ? 'var(--fg-warning)'
                  : 'var(--fg-danger)',
            }}>
              {game.metacritic}
            </span>
          )}
          {genreTags.slice(0, 2).map(tag => {
            const c = TAG_STYLES[tag] || DEFAULT_TAG_STYLE
            return (
              <span key={tag} style={{
                fontFamily: "'VT323', monospace",
                fontSize: 11,
                background: c.bg,
                border: `2px solid ${c.border}`,
                color: c.text,
                padding: '1px 5px',
                borderRadius: 0,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                lineHeight: 1.4,
              }}>
                {tag}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
