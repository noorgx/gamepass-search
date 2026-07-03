const { Router } = require('express')
const { syncCatalog } = require('../sync')

const router = Router()

router.post('/', async (req, res) => {
  try {
    const result = await syncCatalog(req.db)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/status', (req, res) => {
  const row = req.db.prepare(
    'SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1'
  ).get()
  const total = req.db.prepare('SELECT COUNT(*) as c FROM games').get().c
  res.json({ last_synced: row?.synced_at ?? null, total })
})

module.exports = router
