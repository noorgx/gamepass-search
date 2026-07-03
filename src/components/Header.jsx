import { useState, useEffect } from 'react'

const API = 'http://localhost:3847'

export default function Header({ total }) {
  const [status, setStatus] = useState({ last_synced: null })
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/sync/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch(`${API}/api/sync`, { method: 'POST' })
      const s = await fetch(`${API}/api/sync/status`).then(r => r.json())
      setStatus(s)
    } finally {
      setSyncing(false)
    }
  }

  const lastSync = status.last_synced
    ? new Date(status.last_synced).toLocaleString()
    : 'Never'

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '10px 20px', background: '#111118',
      borderBottom: '1px solid var(--border)', flexShrink: 0
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>🎮 Game Pass Search</h1>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {total} games · Last sync: {lastSync}
      </span>
      <button onClick={handleSync} disabled={syncing}>
        {syncing ? 'Syncing…' : 'Sync Now'}
      </button>
    </header>
  )
}
