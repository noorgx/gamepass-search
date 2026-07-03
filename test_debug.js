const { initDb } = require('./server/db')

const db = initDb(':memory:')

// Insert test data
db.prepare(`INSERT INTO games VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  'A','Alpha','desc','Dev','Pub',2022,90,'[]','[]','[]','Essential','2026-06-01',null,null,new Date().toISOString()
)
db.prepare(`INSERT INTO games VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  'B','Beta','desc','Dev','Pub',2022,85,'[]','[]','[]','Premium','2026-06-01',null,null,new Date().toISOString()
)

// Test queries
console.log('All games:', db.prepare(`SELECT COUNT(*) as c FROM games`).get())
console.log('Filter by tier=Essential:', db.prepare(`SELECT COUNT(*) as c FROM games WHERE tier = ?`).get('Essential'))
console.log('Games data:')
db.prepare(`SELECT * FROM games`).all().forEach(g => {
  console.log(`  - ${g.id}: ${g.tier}`)
})

db.close()
