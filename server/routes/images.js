const { Router } = require('express')
const imageCache = require('../imageCache')

const router = Router()

router.get('/', async (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: 'url param required' })

  const w = Math.min(parseInt(req.query.w) || 200, 800)
  const h = Math.min(parseInt(req.query.h) || 130, 600)

  await imageCache.serve(url, w, h, res)
})

module.exports = router
