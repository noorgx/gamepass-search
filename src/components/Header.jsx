import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:3847'

export default function Header({ total, onSyncComplete, onEnrichComplete }) {
  const [status, setStatus]   = useState({ last_synced: null })
  const [syncing, setSyncing] = useState(false)
  const [enrich, setEnrich]   = useState({ status: 'idle', done: 0, total: 0, unenriched: 0, downloadPct: 0, downloadFile: '' })
  const pollRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/api/sync/status`).then(r => r.json()).then(setStatus).catch(() => {})
    refreshEnrich()
  }, [])

  function refreshEnrich() {
    fetch(`${API}/api/enrich/status`)
      .then(r => r.json())
      .then(s => {
        setEnrich(s)
        if (s.status === 'running' || s.status === 'downloading') startPolling()
        else stopPolling()
      })
      .catch(() => {})
  }

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
      fetch(`${API}/api/enrich/status`).then(r => r.json()).then(s => {
        setEnrich(s)
        if (s.status !== 'running' && s.status !== 'downloading') {
          stopPolling()
          if (s.status === 'done') onEnrichComplete?.()
        }
      }).catch(() => {})
    }, 1200)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch(`${API}/api/sync`, { method: 'POST' })
      const s = await fetch(`${API}/api/sync/status`).then(r => r.json())
      setStatus(s)
      onSyncComplete?.()
      refreshEnrich()
    } finally {
      setSyncing(false)
    }
  }

  async function handleEnrich() {
    await fetch(`${API}/api/enrich`, { method: 'POST' })
    startPolling()
    setEnrich(e => ({ ...e, status: 'downloading' }))
  }

  const lastSync = status.last_synced
    ? new Date(status.last_synced).toLocaleTimeString()
    : 'Never'

  function EnrichStatus() {
    const { status: es, done, total, unenriched, downloadPct, downloadFile } = enrich

    if (es === 'downloading') {
      const file = downloadFile.replace(/.*\//, '').replace(/\?.*/, '')
      return (
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 13, color: 'var(--tertiary-brand)', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
          DOWNLOADING {file} {downloadPct}%
        </span>
      )
    }
    if (es === 'running') {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return (
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 13, color: 'var(--tertiary-brand)', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
          CLASSIFYING {done}/{total} ({pct}%)
        </span>
      )
    }
    if (es === 'error') {
      return (
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 12, color: 'var(--danger)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {enrich.error}
        </span>
      )
    }
    if (unenriched > 0) {
      return (
        <button
          className="btn"
          onClick={handleEnrich}
          style={{
            fontSize: 13, padding: '0.35em 1.1em',
            background: 'var(--neutral-primary-strong)',
            borderColor: 'var(--tertiary-brand-soft)',
            color: 'var(--tertiary-brand-strong)',
            boxShadow: '0 5px 0 0 var(--tertiary-brand)',
          }}
        >
          Enrich Genres ({unenriched})
        </button>
      )
    }
    if (es === 'done' || unenriched === 0) {
      return (
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 12, color: 'var(--tertiary-brand)', letterSpacing: 0.5 }}>
          GENRES OK
        </span>
      )
    }
    return null
  }

  return (
    <header style={{
      background: 'var(--brand)',
      borderBottom: '4px solid var(--border-default)',
      height: 52,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: 26, color: '#fff', letterSpacing: 1, flex: 1 }}>
        GAME PASS
      </span>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: 14, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
        {total} GAMES
      </span>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: 13, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
        {lastSync}
      </span>

      <EnrichStatus />

      <button className="btn" onClick={handleSync} disabled={syncing} style={{ fontSize: 14, padding: '0.45em 1.3em' }}>
        {syncing ? 'Syncing' : 'Sync'}
      </button>
    </header>
  )
}
