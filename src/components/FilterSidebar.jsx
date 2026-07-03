const GENRES = ['Action','Adventure','Arcade','Fighting','Horror','Kids','Racing','RPG','Shooter','Simulation','Sports','Strategy']
const PLATFORMS = ['Console','PC','Cloud']
const MULTIPLAYER = ['Solo','Co-op','Online']
const TIERS = ['Essential','Standard','Premium']

function toggleArray(arr, value) {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function FilterSidebar({ filters, onUpdate, onReset }) {
  return (
    <aside style={{
      width: 'var(--sidebar-width)', flexShrink: 0,
      borderRight: '1px solid var(--border)',
      padding: '16px 14px', overflowY: 'auto',
      background: 'var(--surface)',
    }}>

      <Section title="Genre">
        <select
          multiple
          value={filters.genre}
          onChange={e => onUpdate('genre', [...e.target.selectedOptions].map(o => o.value))}
          style={{ width: '100%', height: 100, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 4 }}
        >
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Section>

      <Section title="Platform">
        {PLATFORMS.map(p => (
          <label key={p} style={{ display: 'flex', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={filters.platform.includes(p)}
              onChange={() => onUpdate('platform', toggleArray(filters.platform, p))}
              style={{ marginRight: 8 }}
              aria-label={p}
            />
            {p}
          </label>
        ))}
      </Section>

      <Section title="Multiplayer">
        {MULTIPLAYER.map(m => (
          <label key={m} style={{ display: 'flex', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={filters.multiplayer.includes(m)}
              onChange={() => onUpdate('multiplayer', toggleArray(filters.multiplayer, m))}
              style={{ marginRight: 8 }}
            />
            {m}
          </label>
        ))}
      </Section>

      <Section title="Release Year">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" placeholder="Min" value={filters.yearMin}
            onChange={e => onUpdate('yearMin', e.target.value)} style={{ width: 70 }} />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="number" placeholder="Max" value={filters.yearMax}
            onChange={e => onUpdate('yearMax', e.target.value)} style={{ width: 70 }} />
        </div>
      </Section>

      <Section title="Metacritic">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" placeholder="Min" min="0" max="100" value={filters.metaMin}
            onChange={e => onUpdate('metaMin', e.target.value)} style={{ width: 70 }} />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="number" placeholder="Max" min="0" max="100" value={filters.metaMax}
            onChange={e => onUpdate('metaMax', e.target.value)} style={{ width: 70 }} />
        </div>
      </Section>

      <Section title="Tier">
        {TIERS.map(t => (
          <label key={t} style={{ display: 'flex', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={filters.tier.includes(t)}
              onChange={() => onUpdate('tier', toggleArray(filters.tier, t))}
              style={{ marginRight: 8 }}
            />
            {t}
          </label>
        ))}
      </Section>

      <Section title="Flags">
        <label style={{ display: 'flex', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={filters.newOnly}
            onChange={e => onUpdate('newOnly', e.target.checked)}
            style={{ marginRight: 8 }}
            aria-label="New (last 30 days)"
          />
          New (last 30 days)
        </label>
        <label style={{ display: 'flex' }}>
          <input
            type="checkbox"
            checked={filters.leavingSoon}
            onChange={e => onUpdate('leavingSoon', e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Leaving soon
        </label>
      </Section>

      <button onClick={onReset} style={{ width: '100%', background: '#333', marginTop: 8 }}>
        Reset Filters
      </button>
    </aside>
  )
}
