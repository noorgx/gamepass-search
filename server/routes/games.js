const { Router } = require('express')

const router = Router()

function buildQuery(params) {
  const conditions = []
  const values = []

  if (params.q) {
    conditions.push('title LIKE ?')
    values.push(`%${params.q}%`)
  }
  if (params.genre) {
    params.genre.split(',').forEach(g => {
      conditions.push('genre LIKE ?')
      values.push(`%${g.trim()}%`)
    })
  }
  if (params.genreTag) {
    params.genreTag.split(',').forEach(g => {
      conditions.push('genre_tags LIKE ?')
      values.push(`%"${g.trim()}"%`)
    })
  }
  if (params.genreTagExclude) {
    params.genreTagExclude.split(',').forEach(g => {
      conditions.push('(genre_tags IS NULL OR genre_tags NOT LIKE ?)')
      values.push(`%"${g.trim()}"%`)
    })
  }
  if (params.platform) {
    params.platform.split(',').forEach(p => {
      conditions.push('platforms LIKE ?')
      values.push(`%${p.trim()}%`)
    })
  }
  if (params.platformExclude) {
    params.platformExclude.split(',').forEach(p => {
      conditions.push('(platforms IS NULL OR platforms NOT LIKE ?)')
      values.push(`%${p.trim()}%`)
    })
  }
  if (params.multiplayer) {
    params.multiplayer.split(',').forEach(m => {
      conditions.push('multiplayer LIKE ?')
      values.push(`%${m.trim()}%`)
    })
  }
  if (params.multiplayerExclude) {
    params.multiplayerExclude.split(',').forEach(m => {
      conditions.push('(multiplayer IS NULL OR multiplayer NOT LIKE ?)')
      values.push(`%${m.trim()}%`)
    })
  }
  if (params.tier) {
    params.tier.split(',').forEach(t => {
      conditions.push('tier = ?')
      values.push(t.trim())
    })
  }
  if (params.tierExclude) {
    params.tierExclude.split(',').forEach(t => {
      conditions.push('(tier IS NULL OR tier != ?)')
      values.push(t.trim())
    })
  }
  if (params.yearMin) { conditions.push('release_year >= ?'); values.push(parseInt(params.yearMin)) }
  if (params.yearMax) { conditions.push('release_year <= ?'); values.push(parseInt(params.yearMax)) }
  if (params.metaMin) { conditions.push('metacritic >= ?'); values.push(parseInt(params.metaMin)) }
  if (params.metaMax) { conditions.push('metacritic <= ?'); values.push(parseInt(params.metaMax)) }
  if (params.newOnly === 'true') {
    conditions.push("date(added_date) >= date('now', '-30 days')")
  }
  if (params.leavingSoon === 'true') {
    conditions.push("leaving_date IS NOT NULL AND date(leaving_date) <= date('now', '+30 days')")
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(parseInt(params.limit) || 50, 200)
  const offset = parseInt(params.offset) || 0

  return { where, values, limit, offset }
}

router.get('/', (req, res) => {
  const db = req.db
  const { where, values, limit, offset } = buildQuery(req.query)

  const total = db.prepare(`SELECT COUNT(*) as c FROM games ${where}`).get(...values).c
  const games = db.prepare(`SELECT * FROM games ${where} ORDER BY title LIMIT ? OFFSET ?`).all(
    ...values, limit, offset
  )

  res.json({ total, games })
})

// GET /api/games/genres — aggregate enriched genre counts, respecting current filters
router.get('/genres', (req, res) => {
  // Use ALL active filters (including genreTag) so counts are true drilldown counts —
  // each tag's number shows "how many games match everything you've selected + this tag"
  const filterParams = { ...req.query }
  delete filterParams.limit
  delete filterParams.offset

  const { where, values } = buildQuery(filterParams)
  const tagFilter = `genre_tags IS NOT NULL AND genre_tags != '[]'`
  const sql = where
    ? `SELECT genre_tags FROM games ${where} AND ${tagFilter}`
    : `SELECT genre_tags FROM games WHERE ${tagFilter}`
  const rows = req.db.prepare(sql).all(...values)

  const counts = {}
  for (const row of rows) {
    try {
      for (const tag of JSON.parse(row.genre_tags)) counts[tag] = (counts[tag] || 0) + 1
    } catch (_) {}
  }
  const genres = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
  res.json(genres)
})

router.get('/:id', (req, res) => {
  const game = req.db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id)
  if (!game) return res.status(404).json({ error: 'Not found' })
  res.json(game)
})

module.exports = router
