const CATALOG_URL = 'https://displaycatalog.mp.microsoft.com/v7.0/products'
const BATCH_SIZE  = 20

// ── Sigl IDs (discovered from xbox.com network traffic) ───────────────────────
const SIGLS_V2 = {
  allConsole:   'f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e',
}
const SIGLS_V3 = {
  leavingSoon:   '393f05bf-e596-4ef6-9487-6d4fa0eab987',
  recentlyAdded: '06323672-b8c8-43cc-b0de-32d5a9834749',
  comingSoon:    '095bda36-f5cd-43f2-9ee1-0a72f371fb96',
  essential:     '34031711-5a70-4196-bab7-45757dc2294e',
  premium:       '09a72c0d-c466-426a-9580-b78955d8173a',
}
const V3_PARAMS = 'language=en-us&market=US&platformContext=ConsoleGen9&subscriptionContext=cfq7ttc0khs0'

async function fetchSiglIds(siglId, v3 = false) {
  const url = v3
    ? `https://catalog.gamepass.com/sigls/v3?id=${siglId}&${V3_PARAMS}`
    : `https://catalog.gamepass.com/sigls/v2?id=${siglId}&language=en-us&market=US`
  try {
    const res = await fetch(url)
    if (!res.ok) return new Set()
    const data = await res.json()
    return new Set(data.filter(x => x.id).map(x => x.id))
  } catch { return new Set() }
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
  const props      = product.LocalizedProperties?.[0] || {}
  const marketProps = product.MarketProperties?.[0] || {}
  const sysProps   = product.Properties || {}

  const images = props.Images || []
  const thumb  = images.find(img =>
    img.ImagePurpose === 'Tile' || img.ImagePurpose === 'Logo'
  ) || images[0]

  const releaseDate = marketProps.OriginalReleaseDate
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null

  const platforms = new Set()
  for (const dep of product.PlatformDependencies || []) {
    const name = dep.PlatformName || ''
    if (name.includes('Xbox'))    platforms.add('Console')
    if (name.includes('Windows')) platforms.add('PC')
  }
  if (platforms.size > 0) platforms.add('Cloud')

  return {
    id:           product.ProductId,
    title:        props.ProductTitle || '',
    description:  props.ProductDescription || '',
    developer:    props.DeveloperName || '',
    publisher:    props.PublisherName || '',
    release_year: releaseYear,
    metacritic:   null,
    genre:        JSON.stringify(sysProps.Category ? [sysProps.Category] : []),
    platforms:    JSON.stringify([...platforms]),
    multiplayer:  JSON.stringify([]),
    tier:         null,          // filled in by syncCatalog from tier sigls
    added_date:   '2000-01-01', // placeholder; overwritten by syncCatalog
    leaving_date: null,         // filled in by syncCatalog from leavingSoon sigl
    image_url:    thumb ? `https:${thumb.Uri}` : null,
    last_synced:  new Date().toISOString(),
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
      tier         = excluded.tier,
      leaving_date = excluded.leaving_date,
      last_synced  = excluded.last_synced,
      -- Only advance added_date, never regress it (keeps historical "first seen" date)
      added_date   = CASE WHEN excluded.added_date > games.added_date
                          THEN excluded.added_date
                          ELSE games.added_date END
  `)

  let added = 0
  const run = db.transaction((games) => {
    for (const g of games) {
      const exists = db.prepare('SELECT 1 FROM games WHERE id = ?').get(g.id)
      stmt.run(
        g.id, g.title, g.description, g.developer, g.publisher, g.release_year,
        g.metacritic, g.genre, g.platforms, g.multiplayer, g.tier,
        g.added_date, g.leaving_date, g.image_url, g.last_synced
      )
      if (!exists) added++
    }
  })
  run(games)
  return { added }
}

async function syncCatalog(db) {
  // Fetch all metadata sigls in parallel alongside main catalog
  const [allIds, leavingIds, recentIds, essentialIds, premiumIds] = await Promise.all([
    fetchSiglIds(SIGLS_V2.allConsole, false),
    fetchSiglIds(SIGLS_V3.leavingSoon,   true),
    fetchSiglIds(SIGLS_V3.recentlyAdded, true),
    fetchSiglIds(SIGLS_V3.essential,     true),
    fetchSiglIds(SIGLS_V3.premium,       true),
  ])

  const allIdArray = [...allIds]
  const products   = await fetchGameDetails(allIdArray)

  const today       = new Date().toISOString().split('T')[0]
  // Leaving soon = leave within ~30 days (Microsoft doesn't give the exact date)
  const leavingDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const games = products.map(p => {
    const g = parseProduct(p)

    // Tier from official Microsoft tier sigls
    if (essentialIds.has(g.id))      g.tier = 'Essential'
    else if (premiumIds.has(g.id))   g.tier = 'Premium'
    else                             g.tier = 'Standard'

    // added_date: use today only for officially "recently added" games
    g.added_date = recentIds.has(g.id) ? today : '2000-01-01'

    // leaving_date: set approximate date for leaving-soon games
    g.leaving_date = leavingIds.has(g.id) ? leavingDate : null

    return g
  })

  const { added } = upsertGames(db, games)

  // Sync added_date precisely with Microsoft's "recently added" list.
  // Non-recent games get a historical placeholder so future syncs detect new additions.
  const recentArray = [...recentIds]
  if (recentArray.length > 0) {
    const ph = recentArray.map(() => '?').join(',')
    db.transaction(() => {
      db.prepare(`UPDATE games SET added_date = ?   WHERE id IN    (${ph})`).run(today, ...recentArray)
      db.prepare(`UPDATE games SET added_date = '2000-01-01' WHERE id NOT IN (${ph})`).run(...recentArray)
    })()
  }

  // Remove games no longer in catalog
  const placeholders = allIdArray.map(() => '?').join(',')
  const { changes: removed } = db.prepare(
    `DELETE FROM games WHERE id NOT IN (${placeholders})`
  ).run(...allIdArray)

  const synced_at = new Date().toISOString()
  db.prepare(
    'INSERT INTO sync_log (synced_at, games_added, games_removed) VALUES (?, ?, ?)'
  ).run(synced_at, added, removed)

  return { added, removed, synced_at }
}

module.exports = { fetchGamePassIds: () => fetchSiglIds(SIGLS_V2.allConsole, false), fetchGameDetails, parseProduct, upsertGames, syncCatalog }
