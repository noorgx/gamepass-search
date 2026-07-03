const express = require('express')
const request = require('supertest')
const { initDb } = require('../db')
const { createSyncRouter } = require('./sync')

const mockSyncCatalog = vi.fn().mockResolvedValue({ added: 5, removed: 1, synced_at: '2026-07-03T10:00:00.000Z' })

function makeApp(db) {
  const app = express()
  app.use((req, res, next) => { req.db = db; next() })
  app.use('/api/sync', createSyncRouter(mockSyncCatalog))
  return app
}

describe('POST /api/sync', () => {
  let db, app
  beforeEach(() => { db = initDb(':memory:'); app = makeApp(db); vi.clearAllMocks() })
  afterEach(() => db.close())

  it('returns added/removed/synced_at', async () => {
    const res = await request(app).post('/api/sync')
    expect(res.status).toBe(200)
    expect(res.body.added).toBe(5)
    expect(res.body.removed).toBe(1)
    expect(res.body.synced_at).toBe('2026-07-03T10:00:00.000Z')
  })
})

describe('GET /api/sync/status', () => {
  let db, app
  beforeEach(() => { db = initDb(':memory:'); app = makeApp(db) })
  afterEach(() => db.close())

  it('returns null last_synced when no sync has run', async () => {
    const res = await request(app).get('/api/sync/status')
    expect(res.status).toBe(200)
    expect(res.body.last_synced).toBeNull()
    expect(res.body.total).toBe(0)
  })

  it('returns last sync time and game count after insert', async () => {
    db.prepare('INSERT INTO sync_log (synced_at, games_added, games_removed) VALUES (?,?,?)').run(
      '2026-07-03T10:00:00.000Z', 10, 0
    )
    db.prepare(`INSERT INTO games VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      'G1','Title','desc','dev','pub',2022,80,'[]','[]','[]','Premium','2026-06-01',null,null,new Date().toISOString()
    )
    const res = await request(app).get('/api/sync/status')
    expect(res.body.last_synced).toBe('2026-07-03T10:00:00.000Z')
    expect(res.body.total).toBe(1)
  })
})
