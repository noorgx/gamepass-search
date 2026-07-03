// Mock better-sqlite3 for testing with a pure JavaScript implementation
// This is a workaround for NODE_MODULE_VERSION mismatch in test environment
const Module = require('module');
const originalRequire = Module.prototype.require;

// Simple in-memory SQLite mock using JavaScript
class MockDatabase {
  constructor(path) {
    this.path = path;
    this.tables = {};           // tableName -> Map<pkValue, record>
    this.tableSchemas = {};     // tableName -> [{ name, type }]  (for pragma table_info)
    this.tablePrimaryKeys = {}; // tableName -> primary key column name
    this.tableColumns = {};     // tableName -> [column names in insertion order]
  }

  pragma(command) {
    if (command.startsWith('journal_mode = ')) {
      return { journal_mode: 'wal' };
    }
    const match = command.match(/table_info\(([^)]+)\)/);
    if (match) {
      const tableName = match[1];
      return this.tableSchemas[tableName] || [];
    }
    return null;
  }

  exec(sql) {
    // Parse SQL to extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = createTableRegex.exec(sql)) !== null) {
      const tableName = match[1];
      const tableDef = match[2];

      const columns = [];
      let primaryKey = 'id'; // default

      // Split on commas to get one line per column definition
      const lines = tableDef.split(',');
      for (const line of lines) {
        const trimmed = line.trim();
        const colMatch = trimmed.match(/^(\w+)\s+(\w+.*)/);
        if (colMatch) {
          const colName = colMatch[1];
          const colDef = colMatch[2].trim();
          columns.push({ name: colName, type: colDef });
          if (colDef.toUpperCase().includes('PRIMARY KEY')) {
            primaryKey = colName;
          }
        }
      }

      this.tables[tableName] = new Map();
      this.tableSchemas[tableName] = columns;
      this.tablePrimaryKeys[tableName] = primaryKey;
      this.tableColumns[tableName] = columns.map(c => c.name);
    }
    return this;
  }

  prepare(sql) {
    const db = this;
    const sqlStr = sql.trim();

    // ── INSERT ──────────────────────────────────────────────────────────────
    if (/^INSERT\s+INTO\s+/i.test(sqlStr)) {
      const tableMatch = sqlStr.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
      if (!tableMatch) {
        return { run: () => ({ changes: 0 }), get: () => null, all: () => [] };
      }
      const tableName = tableMatch[1];
      const cols = tableMatch[2].split(',').map(c => c.trim());
      const isUpsert = /ON\s+CONFLICT/i.test(sqlStr);

      // Columns to update on conflict (e.g. "title = excluded.title" → 'title')
      let upsertCols = [];
      if (isUpsert) {
        const updateMatch = sqlStr.match(/DO\s+UPDATE\s+SET\s+([\s\S]+)$/i);
        if (updateMatch) {
          upsertCols = updateMatch[1]
            .split(',')
            .map(s => { const m = s.trim().match(/^(\w+)\s*=/); return m ? m[1] : null; })
            .filter(Boolean);
        }
      }

      return {
        run: (...args) => {
          if (!db.tables[tableName]) return { changes: 0 };
          const pk = db.tablePrimaryKeys[tableName] || 'id';
          const pkIdx = cols.indexOf(pk);

          const record = {};
          cols.forEach((col, i) => { record[col] = args[i]; });

          if (pkIdx >= 0) {
            const pkVal = args[pkIdx];
            if (isUpsert && db.tables[tableName].has(pkVal)) {
              // Update only the declared SET columns
              const existing = db.tables[tableName].get(pkVal);
              const colsToUpdate = upsertCols.length > 0 ? upsertCols : cols;
              for (const col of colsToUpdate) {
                if (record[col] !== undefined) existing[col] = record[col];
              }
            } else {
              db.tables[tableName].set(pkVal, record);
            }
          } else {
            // AUTOINCREMENT — generate a synthetic key
            const autoId = db.tables[tableName].size + 1;
            record[pk] = autoId;
            db.tables[tableName].set(autoId, record);
          }
          return { changes: 1 };
        },
        get: () => null,
        all: () => []
      };
    }

    // ── SELECT ───────────────────────────────────────────────────────────────
    if (/^SELECT\s+/i.test(sqlStr)) {
      const fromMatch = sqlStr.match(/FROM\s+(\w+)/i);
      const tableName = fromMatch ? fromMatch[1] : null;
      const whereMatch = sqlStr.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      const whereCol = whereMatch ? whereMatch[1] : null;
      const countMatch = sqlStr.match(/COUNT\(\*\)\s+as\s+(\w+)/i);

      return {
        run: () => ({ changes: 0 }),
        get: (...args) => {
          if (!tableName || !db.tables[tableName]) return null;

          // COUNT(*) as alias
          if (countMatch) {
            const alias = countMatch[1];
            const result = {};
            result[alias] = db.tables[tableName].size;
            return result;
          }

          // WHERE col = ?
          if (whereCol && args.length > 0) {
            const whereVal = args[0];
            for (const record of db.tables[tableName].values()) {
              if (record[whereCol] === whereVal) return record;
            }
            return null;
          }

          // No WHERE — return first record or null
          const first = db.tables[tableName].values().next().value;
          return first || null;
        },
        all: (...args) => {
          if (!tableName || !db.tables[tableName]) return [];
          if (whereCol && args.length > 0) {
            const whereVal = args[0];
            return [...db.tables[tableName].values()].filter(r => r[whereCol] === whereVal);
          }
          return [...db.tables[tableName].values()];
        }
      };
    }

    // ── Default fallback ──────────────────────────────────────────────────────
    return {
      run: () => ({ changes: 0 }),
      get: () => null,
      all: () => []
    };
  }

  transaction(fn) {
    // Wrap fn so it can be called like a real transaction
    return (...args) => fn(...args);
  }

  close() {
    // no-op
  }
}

// Replace the require for better-sqlite3
Module.prototype.require = function(id) {
  if (id === 'better-sqlite3') {
    return function MockBetterSqlite3(path) {
      return new MockDatabase(path);
    };
  }
  return originalRequire.apply(this, arguments);
};
