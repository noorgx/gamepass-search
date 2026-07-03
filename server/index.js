const express = require('express')
const gamesRouter = require('./routes/games')
const { createSyncRouter } = require('./routes/sync')
const { syncCatalog } = require('./sync')

function startServer(port, db) {
  const app = express()

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST')
    next()
  })

  app.use((req, res, next) => { req.db = db; next() })
  app.use(express.json())

  app.use('/api/games', gamesRouter)
  app.use('/api/sync', createSyncRouter(syncCatalog))

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => resolve(server))
    server.on('error', reject)
  })
}

module.exports = { startServer }
