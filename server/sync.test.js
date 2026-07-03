const { fetchGamePassIds, fetchGameDetails, parseProduct, upsertGames } = require('./sync')
const { initDb } = require('./db')

// Mock global fetch
global.fetch = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('fetchGamePassIds', () => {
  it('returns array of product ID strings', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { sigl: 'f6f1f99f' },           // non-game entry — should be filtered out
        { id: '9NPDN9R45JX4' },
        { id: '9P8LR42PTRGJ' },
      ]
    })

    const ids = await fetchGamePassIds()
    expect(ids).toEqual(['9NPDN9R45JX4', '9P8LR42PTRGJ'])
  })

  it('throws on non-ok response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(fetchGamePassIds()).rejects.toThrow('Failed to fetch Game Pass IDs: 503')
  })
})

describe('fetchGameDetails', () => {
  it('batches IDs into groups of 20', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `ID${i}`)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ Products: [] })
    })

    await fetchGameDetails(ids)
    expect(global.fetch).toHaveBeenCalledTimes(2) // 20 + 5
  })

  it('returns flattened product array', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Products: [{ ProductId: 'A' }, { ProductId: 'B' }] })
    })

    const results = await fetchGameDetails(['A', 'B'])
    expect(results).toHaveLength(2)
    expect(results[0].ProductId).toBe('A')
  })
})

describe('parseProduct', () => {
  const mockProduct = {
    ProductId: 'TEST123',
    LocalizedProperties: [{
      ProductTitle: 'Test Game',
      ProductDescription: 'A great game',
      DeveloperName: 'Dev Co',
      PublisherName: 'Pub Co',
      Images: [{ ImagePurpose: 'Tile', Uri: '//example.com/img.png' }]
    }],
    MarketProperties: [{ OriginalReleaseDate: '2022-03-15T00:00:00Z' }],
    Properties: { Category: 'Action' },
    PlatformDependencies: [
      { PlatformName: 'Windows.Desktop' },
      { PlatformName: 'Xbox.XboxOne' }
    ]
  }

  it('parses title, description, developer, publisher', () => {
    const game = parseProduct(mockProduct)
    expect(game.id).toBe('TEST123')
    expect(game.title).toBe('Test Game')
    expect(game.description).toBe('A great game')
    expect(game.developer).toBe('Dev Co')
    expect(game.publisher).toBe('Pub Co')
  })

  it('parses release year from OriginalReleaseDate', () => {
    const game = parseProduct(mockProduct)
    expect(game.release_year).toBe(2022)
  })

  it('parses platforms from PlatformDependencies', () => {
    const game = parseProduct(mockProduct)
    const platforms = JSON.parse(game.platforms)
    expect(platforms).toContain('PC')
    expect(platforms).toContain('Console')
  })

  it('builds image_url with https prefix', () => {
    const game = parseProduct(mockProduct)
    expect(game.image_url).toBe('https://example.com/img.png')
  })

  it('sets metacritic to null', () => {
    const game = parseProduct(mockProduct)
    expect(game.metacritic).toBeNull()
  })
})

describe('upsertGames', () => {
  let db

  beforeEach(() => {
    db = initDb(':memory:')
  })

  afterEach(() => db.close())

  const makeGame = (id, title) => ({
    id,
    title,
    genre: '["Action"]',
    platforms: '["Console","PC"]',
    multiplayer: '[]',
    developer: 'Dev',
    publisher: 'Pub',
    release_year: 2022,
    metacritic: null,
    tier: null,
    added_date: '2026-07-01',
    leaving_date: null,
    image_url: null,
    description: 'desc',
    last_synced: new Date().toISOString()
  })

  it('inserts new games and returns added count', () => {
    const { added } = upsertGames(db, [makeGame('A', 'Alpha'), makeGame('B', 'Beta')])
    expect(added).toBe(2)
    const count = db.prepare('SELECT COUNT(*) as c FROM games').get().c
    expect(count).toBe(2)
  })

  it('updates existing game without incrementing added count', () => {
    upsertGames(db, [makeGame('A', 'Alpha')])
    const { added } = upsertGames(db, [makeGame('A', 'Alpha Updated')])
    expect(added).toBe(0)
    const title = db.prepare('SELECT title FROM games WHERE id = ?').get('A').title
    expect(title).toBe('Alpha Updated')
  })
})
