const Database = require('better-sqlite3')

let _db = null

function initDb(dbPath) {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      description   TEXT,
      developer     TEXT,
      publisher     TEXT,
      release_year  INTEGER,
      metacritic    INTEGER,
      genre         TEXT,
      platforms     TEXT,
      multiplayer   TEXT,
      tier          TEXT,
      added_date    TEXT,
      leaving_date  TEXT,
      image_url     TEXT,
      last_synced   TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at     TEXT NOT NULL,
      games_added   INTEGER DEFAULT 0,
      games_removed INTEGER DEFAULT 0
    );
  `)
  _db = db
  return db
}

function getDb() {
  if (!_db) throw new Error('Database not initialized')
  return _db
}

function _resetForTesting() { _db = null }

module.exports = { initDb, getDb, _resetForTesting }
