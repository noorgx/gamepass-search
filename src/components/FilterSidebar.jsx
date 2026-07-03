import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:3847'

// ── Category groups ────────────────────────────────────────────────────────────
const CATEGORY_GROUPS = {
  Genre:    ['Action','Adventure','RPG','Shooter','Strategy','Sports','Racing','Horror','Survival','Simulation','Platformer','Fighting','Puzzle','Indie','Casual'],
  Themes:   ['Sci-fi','Fantasy','Cyberpunk','Post-apocalyptic','Anime','Medieval','Historical','Space'],
  Features: ['Open World','Roguelike','Metroidvania','Stealth','Crafting','Sandbox','Tower Defense','Battle Royale'],
  Mood:     ['Story Rich','Relaxing','Dark','Atmospheric','Funny'],
}

const GROUP_COLORS = {
  Genre: '#6633FF', Themes: '#94BFEA', Features: '#7DEDA9', Mood: '#B070FF',
}

const TAG_COLORS = {
  Action:'#6633FF', Adventure:'#B070FF', RPG:'#7DEDA9', Shooter:'#FF5555',
  Strategy:'#94BFEA', Sports:'#1FC11B', Racing:'#FFD913', Horror:'#FF5555',
  Survival:'#FFD913', Simulation:'#94BFEA', Platformer:'#7DEDA9', Fighting:'#FF5555',
  Puzzle:'#B070FF', Indie:'#A09BC4', Casual:'#7DEDA9',
  'Sci-fi':'#55E1FF', Fantasy:'#FFB900', Cyberpunk:'#FF55AA', 'Post-apocalyptic':'#FF9C55',
  Anime:'#FF55AA', Medieval:'#FFD913', Historical:'#94BFEA', Space:'#55E1FF',
  'Open World':'#7DEDA9', Roguelike:'#FF9C55', Metroidvania:'#B070FF',
  Stealth:'#A09BC4', Crafting:'#7DEDA9', Sandbox:'#FFD913',
  'Tower Defense':'#94BFEA', 'Battle Royale':'#FF5555',
  'Story Rich':'#B070FF', Relaxing:'#7DEDA9', Dark:'#5C4F8A', Atmospheric:'#94BFEA', Funny:'#FFD913',
}

const PLATFORMS   = ['Console','PC','Cloud']
const MULTIPLAYER = ['Solo','Co-op','Online Multiplayer']
const TIERS       = ['Essential','Standard','Premium']

// ── Three-state indicator ──────────────────────────────────────────────────────
// state: 'include' | 'exclude' | null
function StateBox({ state, color }) {
  if (state === 'include') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, flexShrink: 0,
      background: color || 'var(--brand)', border: `2px solid ${color || 'var(--brand)'}`,
      color: '#000', fontSize: 11, fontWeight: 700,
    }}>✓</span>
  )
  if (state === 'exclude') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, flexShrink: 0,
      background: 'var(--danger)', border: '2px solid var(--danger)',
      color: '#fff', fontSize: 11, fontWeight: 700,
    }}>✕</span>
  )
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16, flexShrink: 0,
      border: '2px solid var(--border-default)', background: 'transparent',
    }} />
  )
}

// ── Generic cycled filter row ──────────────────────────────────────────────────
function FilterRow({ label, state, color, count, onCycle, dimmed }) {
  return (
    <div
      onClick={onCycle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        padding: '3px 0', userSelect: 'none',
        opacity: dimmed ? 0.35 : 1,
      }}
    >
      <StateBox state={state} color={color} />
      {color && state === null && (
        <span style={{ display: 'inline-block', width: 7, height: 7, background: color, flexShrink: 0 }} />
      )}
      <span style={{
        fontFamily: "'VT323', monospace", fontSize: 16,
        color: state === 'include' ? 'var(--heading)'
             : state === 'exclude' ? 'var(--fg-danger)'
             : 'var(--body)',
        flex: 1,
      }}>
        {label}
      </span>
      {count != null && (
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 13, color: 'var(--text-dim)' }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────────────────────────────────
function Section({ title, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderTop: '2px solid var(--border-default)', paddingTop: 12, marginBottom: 4 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          marginBottom: open ? 10 : 4,
        }}
      >
        <span style={{
          fontFamily: "'VT323', monospace", fontSize: 12,
          color: color || 'var(--body-subtle)',
          textTransform: 'uppercase', letterSpacing: 2, flex: 1,
        }}>
          {title}
        </span>
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && children}
      <div style={{ marginBottom: 6 }} />
    </div>
  )
}

// ── Main sidebar ───────────────────────────────────────────────────────────────
export default function FilterSidebar({ filters, updateFilter, cycleFilter, onReset, enrichKey = 0 }) {
  const [genreMap, setGenreMap] = useState(new Map())

  // Build query string for drilldown — same as useGames but for the genres endpoint
  const buildGenreParams = useCallback(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    // Include ALL active filters so sidebar counts are true drilldown numbers
    if (filters.genreTag?.length)            p.set('genreTag',            filters.genreTag.join(','))
    if (filters.genreTagExclude?.length)     p.set('genreTagExclude',     filters.genreTagExclude.join(','))
    if (filters.platform?.length)            p.set('platform',            filters.platform.join(','))
    if (filters.platformExclude?.length)     p.set('platformExclude',     filters.platformExclude.join(','))
    if (filters.multiplayer?.length)         p.set('multiplayer',         filters.multiplayer.join(','))
    if (filters.multiplayerExclude?.length)  p.set('multiplayerExclude',  filters.multiplayerExclude.join(','))
    if (filters.tier?.length)                p.set('tier',                filters.tier.join(','))
    if (filters.tierExclude?.length)         p.set('tierExclude',         filters.tierExclude.join(','))
    if (filters.yearMin)    p.set('yearMin', filters.yearMin)
    if (filters.yearMax)    p.set('yearMax', filters.yearMax)
    if (filters.metaMin)    p.set('metaMin', filters.metaMin)
    if (filters.metaMax)    p.set('metaMax', filters.metaMax)
    if (filters.newOnly)    p.set('newOnly', 'true')
    if (filters.leavingSoon) p.set('leavingSoon', 'true')
    return p.toString()
  }, [filters])

  useEffect(() => {
    const qs = buildGenreParams()
    fetch(`${API}/api/games/genres?${qs}`)
      .then(r => r.json())
      .then(list => setGenreMap(new Map(list.map(({ name, count }) => [name, count]))))
      .catch(() => {})
  }, [enrichKey, buildGenreParams])

  function tagState(tag) {
    if (filters.genreTag.includes(tag))        return 'include'
    if (filters.genreTagExclude.includes(tag)) return 'exclude'
    return null
  }

  function simpleState(includeArr, excludeArr, val) {
    if (includeArr.includes(val)) return 'include'
    if (excludeArr.includes(val)) return 'exclude'
    return null
  }

  const hasGenres = genreMap.size > 0

  return (
    <aside style={{
      width: 'var(--sidebar-width)', flexShrink: 0,
      borderRight: '2px solid var(--border-default)',
      padding: '16px 16px', overflowY: 'auto',
      background: 'var(--neutral-primary-soft)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontFamily: "'VT323', monospace", fontSize: 12, color: 'var(--body-subtle)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
        Browse
      </div>

      {/* ── Genre groups ── */}
      {hasGenres
        ? Object.entries(CATEGORY_GROUPS).map(([group, tags]) => {
            const visibleTags = tags.filter(t => genreMap.has(t) || tagState(t) !== null)
            if (visibleTags.length === 0) return null
            return (
              <Section key={group} title={group} color={GROUP_COLORS[group]}>
                {visibleTags.map(tag => (
                  <FilterRow
                    key={tag}
                    label={tag}
                    state={tagState(tag)}
                    color={TAG_COLORS[tag] || GROUP_COLORS[group]}
                    count={genreMap.get(tag)}
                    dimmed={genreMap.has(tag) && genreMap.get(tag) === 0 && tagState(tag) === null}
                    onCycle={() => cycleFilter('genreTag', 'genreTagExclude', tag)}
                  />
                ))}
              </Section>
            )
          })
        : (
          <Section title="Categories">
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 14, color: 'var(--body-subtle)', lineHeight: 1.6 }}>
              Click Enrich Genres to classify games with AI.
            </div>
          </Section>
        )
      }

      {/* ── Tier ── */}
      <Section title="Tier" color="var(--brand)">
        {TIERS.map(t => {
          const state = simpleState(filters.tier, filters.tierExclude, t)
          return (
            <FilterRow
              key={t} label={t} state={state}
              onCycle={() => cycleFilter('tier', 'tierExclude', t)}
            />
          )
        })}
      </Section>

      {/* ── Platform ── */}
      <Section title="Platform" color="var(--quaternary-brand)">
        {PLATFORMS.map(p => (
          <FilterRow
            key={p} label={p}
            state={simpleState(filters.platform, filters.platformExclude, p)}
            onCycle={() => cycleFilter('platform', 'platformExclude', p)}
          />
        ))}
      </Section>

      {/* ── Multiplayer ── */}
      <Section title="Multiplayer" color="var(--tertiary-brand)">
        {MULTIPLAYER.map(m => (
          <FilterRow
            key={m} label={m}
            state={simpleState(filters.multiplayer, filters.multiplayerExclude, m)}
            onCycle={() => cycleFilter('multiplayer', 'multiplayerExclude', m)}
          />
        ))}
      </Section>

      {/* ── Release Year ── */}
      <Section title="Release Year" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" type="number" placeholder="Min" value={filters.yearMin}
            onChange={e => updateFilter('yearMin', e.target.value)} style={{ width: '46%', padding: '7px 8px', fontSize: 15 }} />
          <span style={{ fontFamily: "'VT323', monospace", color: 'var(--body-subtle)', fontSize: 15 }}>to</span>
          <input className="input" type="number" placeholder="Max" value={filters.yearMax}
            onChange={e => updateFilter('yearMax', e.target.value)} style={{ width: '46%', padding: '7px 8px', fontSize: 15 }} />
        </div>
      </Section>

      {/* ── Metacritic ── */}
      <Section title="Metacritic" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" type="number" placeholder="0" min="0" max="100" value={filters.metaMin}
            onChange={e => updateFilter('metaMin', e.target.value)} style={{ width: '46%', padding: '7px 8px', fontSize: 15 }} />
          <span style={{ fontFamily: "'VT323', monospace", color: 'var(--body-subtle)', fontSize: 15 }}>to</span>
          <input className="input" type="number" placeholder="100" min="0" max="100" value={filters.metaMax}
            onChange={e => updateFilter('metaMax', e.target.value)} style={{ width: '46%', padding: '7px 8px', fontSize: 15 }} />
        </div>
      </Section>

      {/* ── Availability ── */}
      <Section title="Availability" color="var(--secondary-brand)">
        <FilterRow
          label="New (last 30 days)"
          state={filters.newOnly ? 'include' : null}
          onCycle={() => updateFilter('newOnly', !filters.newOnly)}
        />
        <FilterRow
          label="Leaving soon"
          state={filters.leavingSoon ? 'include' : null}
          onCycle={() => updateFilter('leavingSoon', !filters.leavingSoon)}
        />
      </Section>

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button className="btn-ghost" onClick={onReset}
          style={{ width: '100%', justifyContent: 'center', border: '2px solid var(--border-default)', fontSize: 15 }}>
          Clear All
        </button>
      </div>
    </aside>
  )
}
