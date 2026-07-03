const path = require('path')
const { Worker } = require('worker_threads')

const GENRES = [
  'Action', 'Adventure', 'RPG', 'Shooter', 'Strategy',
  'Sports', 'Racing', 'Horror', 'Survival', 'Simulation',
  'Platformer', 'Fighting', 'Puzzle', 'Indie', 'Casual',
]

const state = {
  status:       'idle',
  downloadFile: '',
  downloadPct:  0,
  total:        0,
  done:         0,
  error:        null,
}

function getState() { return { ...state } }

function runEnrichment(db) {
  if (state.status === 'running' || state.status === 'downloading') return

  const pending = db.prepare(
    'SELECT id, title, description FROM games WHERE genre_tags IS NULL ORDER BY title'
  ).all()

  if (pending.length === 0) {
    state.status = 'done'; state.total = 0; state.done = 0; return
  }

  state.total  = pending.length
  state.done   = 0
  state.error  = null
  state.status = 'downloading'

  const updateStmt = db.prepare(
    'UPDATE games SET genre_tags = ?, multiplayer = ?, embedding = ? WHERE id = ?'
  )

  // Worker thread — completely isolated from Express/Electron main thread
  const worker = new Worker(
    path.join(__dirname, 'enrichWorker.mjs'),
    { workerData: { games: pending } }
  )

  worker.on('message', ({ type, ...data }) => {
    switch (type) {
      case 'progress':
        state.downloadFile = data.downloadFile
        state.downloadPct  = data.downloadPct
        break
      case 'models_ready':
        state.status = 'running'
        break
      case 'result':
        updateStmt.run(
          JSON.stringify(data.genres),
          JSON.stringify(data.modes),
          data.embedding,
          data.id
        )
        state.done++
        break
      case 'skip':
        state.done++
        break
      case 'error':
        state.status = 'error'
        state.error  = data.error
        break
      case 'done':
        state.status = 'done'
        break
    }
  })

  worker.on('error', err => {
    state.status = 'error'
    state.error  = err.message
  })
}

// Reset enrichment so re-running works after a clear
function resetEnrichment(db) {
  db.prepare('UPDATE games SET genre_tags = NULL, multiplayer = NULL, embedding = NULL').run()
  state.status = 'idle'
  state.done   = 0
  state.total  = 0
  state.error  = null
}

module.exports = { runEnrichment, resetEnrichment, getState, GENRES }
