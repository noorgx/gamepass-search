const { Router } = require('express')
const { runEnrichment, resetEnrichment, getState } = require('../enrich')

const router = Router()

router.get('/status', (req, res) => {
  const s = getState()
  const unenriched = req.db.prepare(
    'SELECT COUNT(*) as c FROM games WHERE genre_tags IS NULL'
  ).get().c
  res.json({ ...s, unenriched })
})

router.post('/', (req, res) => {
  runEnrichment(req.db)
  res.json({ started: true })
})

// DELETE /api/enrich — clear all genre_tags so enrichment can re-run
router.delete('/', (req, res) => {
  resetEnrichment(req.db)
  res.json({ reset: true })
})

module.exports = router
