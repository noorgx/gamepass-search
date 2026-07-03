const { initDb, getDb, _resetForTesting } = require('./db')

describe('initDb', () => {
  let db

  afterEach(() => {
    if (db) { db.close(); db = null }
    _resetForTesting()
  })

  it('creates games table with correct columns', () => {
    db = initDb(':memory:')
    const cols = db.pragma('table_info(games)').map(c => c.name)
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'title', 'genre', 'platforms', 'multiplayer',
      'developer', 'publisher', 'release_year', 'metacritic',
      'tier', 'added_date', 'leaving_date', 'image_url',
      'description', 'last_synced'
    ]))
  })

  it('creates sync_log table with correct columns', () => {
    db = initDb(':memory:')
    const cols = db.pragma('table_info(sync_log)').map(c => c.name)
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'synced_at', 'games_added', 'games_removed'
    ]))
  })

  it('is idempotent — calling twice does not throw', () => {
    db = initDb(':memory:')
    expect(() => initDb(':memory:')).not.toThrow()
  })
})

describe('getDb', () => {
  afterEach(() => _resetForTesting())

  it('returns the db instance after initDb', () => {
    const db = initDb(':memory:')
    expect(getDb()).toBe(db)
    db.close()
  })

  it('throws if called before initDb', () => {
    expect(() => getDb()).toThrow('Database not initialized')
  })
})
