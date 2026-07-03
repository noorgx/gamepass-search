const GAMEPASS_IDS_URL =
  'https://catalog.gamepass.com/sigls/v2?id=f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e&language=en-us&market=US'
const CATALOG_URL = 'https://displaycatalog.mp.microsoft.com/v7.0/products'
const BATCH_SIZE = 20

async function fetchGamePassIds() {
  const res = await fetch(GAMEPASS_IDS_URL)
  if (!res.ok) throw new Error(`Failed to fetch Game Pass IDs: ${res.status}`)
  const data = await res.json()
  return data.filter(item => item.id).map(item => item.id)
}

async function fetchGameDetails(ids) {
  const results = []
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const url = `${CATALOG_URL}?bigIds=${batch.join(',')}&market=US&languages=en-US&MS-CV=DGU1mcuYo0WMMp`
    const res = await fetch(url)
    if (!res.ok) continue
    const data = await res.json()
    if (data.Products) results.push(...data.Products)
  }
  return results
}

function parseProduct(product) {
  const props = product.LocalizedProperties?.[0] || {}
  const marketProps = product.MarketProperties?.[0] || {}
  const sysProps = product.Properties || {}

  const images = props.Images || []
  const thumb = images.find(img =>
    img.ImagePurpose === 'Tile' || img.ImagePurpose === 'Logo'
  ) || images[0]

  const releaseDate = marketProps.OriginalReleaseDate
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null

  const platforms = new Set()
  for (const dep of product.PlatformDependencies || []) {
    const name = dep.PlatformName || ''
    if (name.includes('Xbox')) platforms.add('Console')
    if (name.includes('Windows')) platforms.add('PC')
  }
  if (platforms.size > 0) platforms.add('Cloud')

  const genre = sysProps.Category ? [sysProps.Category] : []

  return {
    id: product.ProductId,
    title: props.ProductTitle || '',
    description: props.ProductDescription || '',
    developer: props.DeveloperName || '',
    publisher: props.PublisherName || '',
    release_year: releaseYear,
    metacritic: null,
    genre: JSON.stringify(genre),
    platforms: JSON.stringify([...platforms]),
    multiplayer: JSON.stringify([]),
    tier: null,
    added_date: new Date().toISOString().split('T')[0],
    leaving_date: null,
    image_url: thumb ? `https:${thumb.Uri}` : null,
    last_synced: new Date().toISOString(),
  }
}

function upsertGames(db, games) {
  const stmt = db.prepare(`
    INSERT INTO games (id, title, description, developer, publisher, release_year,
                       metacritic, genre, platforms, multiplayer, tier, added_date,
                       leaving_date, image_url, last_synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title        = excluded.title,
      description  = excluded.description,
      developer    = excluded.developer,
      publisher    = excluded.publisher,
      release_year = excluded.release_year,
      genre        = excluded.genre,
      platforms    = excluded.platforms,
      image_url    = excluded.image_url,
      last_synced  = excluded.last_synced
  `)

  let added = 0
  const run = db.transaction((games) => {
    for (const g of games) {
      const exists = db.prepare('SELECT 1 FROM games WHERE id = ?').get(g.id)
      stmt.run(
        g.id, g.title, g.description, g.developer, g.publisher, g.release_year,
        g.metacritic, g.genre, g.platforms, g.multiplayer, g.tier, g.added_date,
        g.leaving_date, g.image_url, g.last_synced
      )
      if (!exists) added++
    }
  })
  run(games)
  return { added }
}

async function syncCatalog(db) {
  const ids = await fetchGamePassIds()
  const products = await fetchGameDetails(ids)
  const games = products.map(parseProduct)
  const { added } = upsertGames(db, games)
  const synced_at = new Date().toISOString()
  db.prepare(
    'INSERT INTO sync_log (synced_at, games_added, games_removed) VALUES (?, ?, ?)'
  ).run(synced_at, added, 0)
  return { added, removed: 0, synced_at }
}

module.exports = { fetchGamePassIds, fetchGameDetails, parseProduct, upsertGames, syncCatalog }
