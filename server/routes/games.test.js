import express from 'express'
import request from 'supertest'
import { initDb } from '../db.js'
import gamesRouter from './games.js'

function makeApp(db) {
  const app = express()
  app.use((req, res, next) => { req.db = db; next() })
  app.use('/api/games', gamesRouter)
  return app
}

function insertGame(db, overrides = {}) {
  const g = {
    id: overrides.id || 'GAME1',
    title: overrides.title || 'Test Game',
    description: 'desc',
    developer: 'Dev',
    publisher: 'Pub',
    release_year: overrides.release_year || 2022,
    metacritic: overrides.metacritic || 85,
    genre: overrides.genre || '["Action"]',
    platforms: overrides.platforms || '["Console","PC"]',
    multiplayer: overrides.multiplayer || '["Co-op"]',
    tier: overrides.tier || 'Premium',
    added_date: overrides.added_date || '2026-06-01',
    leaving_date: overrides.leaving_date || null,
    image_url: null,
    last_synced: new Date().toISOString()
  }
  db.prepare(`INSERT INTO games VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    g.id, g.title, g.description, g.developer, g.publisher, g.release_year,
    g.metacritic, g.genre, g.platforms, g.multiplayer, g.tier, g.added_date,
    g.leaving_date, g.image_url, g.last_synced
  )
  return g
}

describe('GET /api/games', () => {
  let db, app

  beforeEach(() => { db = initDb(':memory:'); app = makeApp(db) })
  afterEach(() => db.close())

  it('returns all games with total', async () => {
    insertGame(db, { id: 'A', title: 'Alpha' })
    insertGame(db, { id: 'B', title: 'Beta' })
    const res = await request(app).get('/api/games')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.games).toHaveLength(2)
  })

  it('filters by title search (q)', async () => {
    insertGame(db, { id: 'A', title: 'Halo Infinite' })
    insertGame(db, { id: 'B', title: 'Forza Horizon' })
    const res = await request(app).get('/api/games?q=halo')
    expect(res.body.total).toBe(1)
    expect(res.body.games[0].title).toBe('Halo Infinite')
  })

  it('filters by tier', async () => {
    insertGame(db, { id: 'A', tier: 'Essential' })
    insertGame(db, { id: 'B', tier: 'Premium' })
    const res = await request(app).get('/api/games?tier=Essential')
    expect(res.body.total).toBe(1)
    expect(res.body.games[0].id).toBe('A')
  })

  it('filters by metacritic range', async () => {
    insertGame(db, { id: 'A', metacritic: 90 })
    insertGame(db, { id: 'B', metacritic: 60 })
    const res = await request(app).get('/api/games?metaMin=80')
    expect(res.body.total).toBe(1)
    expect(res.body.games[0].id).toBe('A')
  })

  it('filters newOnly — games added in last 30 days', async () => {
    const today = new Date().toISOString().split('T')[0]
    insertGame(db, { id: 'NEW', added_date: today })
    insertGame(db, { id: 'OLD', added_date: '2020-01-01' })
    const res = await request(app).get('/api/games?newOnly=true')
    expect(res.body.total).toBe(1)
    expect(res.body.games[0].id).toBe('NEW')
  })

  it('filters leavingSoon — leaving within 30 days', async () => {
    const soon = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
    insertGame(db, { id: 'LEAVE', leaving_date: soon })
    insertGame(db, { id: 'STAY', leaving_date: null })
    const res = await request(app).get('/api/games?leavingSoon=true')
    expect(res.body.total).toBe(1)
    expect(res.body.games[0].id).toBe('LEAVE')
  })

  it('paginates with limit and offset', async () => {
    for (let i = 0; i < 5; i++) insertGame(db, { id: `G${i}`, title: `Game ${i}` })
    const res = await request(app).get('/api/games?limit=2&offset=2')
    expect(res.body.games).toHaveLength(2)
    expect(res.body.total).toBe(5)
  })
})

describe('GET /api/games/:id', () => {
  let db, app

  beforeEach(() => { db = initDb(':memory:'); app = makeApp(db) })
  afterEach(() => db.close())

  it('returns a single game by id', async () => {
    insertGame(db, { id: 'GAME1', title: 'My Game' })
    const res = await request(app).get('/api/games/GAME1')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('GAME1')
    expect(res.body.title).toBe('My Game')
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/games/NOTEXIST')
    expect(res.status).toBe(404)
  })
})
