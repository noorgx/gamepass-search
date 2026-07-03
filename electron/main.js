const { app, BrowserWindow } = require('electron')
const path = require('path')
const { initDb } = require('../server/db')
const { startServer } = require('../server/index')
const { syncCatalog } = require('../server/sync')

const API_PORT = 3847
const isDev = process.env.NODE_ENV === 'development'

function getDbPath() {
  return isDev
    ? path.join(__dirname, '../gamepass.dev.db')
    : path.join(app.getPath('userData'), 'gamepass.db')
}

app.whenReady().then(async () => {
  const db = initDb(getDbPath())
  try {
    await startServer(API_PORT, db)
  } catch (err) {
    const { dialog } = require('electron')
    dialog.showErrorBox('Startup Error', `Could not start API server on port ${API_PORT}.\n\n${err.message}`)
    app.quit()
    return
  }

  // Background sync — don't block window creation
  syncCatalog(db).catch(err => console.error('Sync error:', err))

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
