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
      // Handle both: INSERT INTO games (col1, col2, ...) VALUES (?, ?, ...)
      //        and: INSERT INTO games VALUES (?, ?, ...)
      let tableMatch = sqlStr.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
      let tableName, cols;

      if (tableMatch) {
        tableName = tableMatch[1];
        cols = tableMatch[2].split(',').map(c => c.trim());
      } else {
        // VALUES style without column names — use schema order
        tableMatch = sqlStr.match(/INSERT\s+INTO\s+(\w+)\s+VALUES/i);
        if (!tableMatch) {
          return { run: () => ({ changes: 0 }), get: () => null, all: () => [] };
        }
        tableName = tableMatch[1];
        // Use column order from schema
        if (!db.tableColumns[tableName]) {
          return { run: () => ({ changes: 0 }), get: () => null, all: () => [] };
        }
        cols = db.tableColumns[tableName];
      }

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

    // ── Helper: Parse and apply WHERE conditions ───────────────────────────
    const filterRecords = (records, sql, args) => {
      const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:ORDER\s+BY|LIMIT|$)/i);
      if (!whereMatch) return records;

      const whereClause = whereMatch[1].trim();
      let argIndex = 0;

      // Split conditions by AND, but be careful with nested functions like date()
      const conditions = [];
      let current = '';
      let parenDepth = 0;
      for (let i = 0; i < whereClause.length; i++) {
        const char = whereClause[i];
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;
        else if (parenDepth === 0 && whereClause.substring(i, i + 5).toUpperCase() === ' AND ') {
          conditions.push(current.trim());
          current = '';
          i += 4;
          continue;
        }
        current += char;
      }
      if (current) conditions.push(current.trim());

      return records.filter(record => {
        argIndex = 0;
        for (const cond of conditions) {
          if (!db._evaluateCondition(cond, record, args, argIndex)) return false;
          // Count how many ? are in this condition
          const questionMarks = (cond.match(/\?/g) || []).length;
          argIndex += questionMarks;
        }
        return true;
      });
    };

    // ── Helper: Evaluate a single WHERE condition ──────────────────────────
    db._evaluateCondition = function(condition, record, args, startArgIndex) {
      // Try different operators: LIKE, >=, <=, >, <, =, IS, IS NOT

      // Handle "date(col) >= date('now', '-30 days')"
      const dateMatch = condition.match(/date\((\w+)\)\s*(>=|<=|>|<|=)\s*date\('now',\s*'([^']+)'\)/i);
      if (dateMatch) {
        const col = dateMatch[1];
        const op = dateMatch[2];
        const offset = dateMatch[3]; // e.g., '-30 days'
        const recordVal = record[col];
        if (!recordVal) return false;

        const days = parseInt(offset);
        const nowDate = new Date();
        const offsetDate = new Date(nowDate.getTime() + days * 86400000);
        const offsetStr = offsetDate.toISOString().split('T')[0];

        if (op === '>=') return recordVal >= offsetStr;
        if (op === '<=') return recordVal <= offsetStr;
        if (op === '>') return recordVal > offsetStr;
        if (op === '<') return recordVal < offsetStr;
        if (op === '=') return recordVal === offsetStr;
        return false;
      }

      // Handle "col LIKE ?" or "col = ?" or "col >= ?" etc.
      const likeMatch = condition.match(/^(\w+)\s+LIKE\s+\?$/i);
      if (likeMatch) {
        const col = likeMatch[1];
        const pattern = args[startArgIndex];
        const recordVal = record[col];
        if (!recordVal) return false;
        // LIKE pattern: %text% → contains, text% → starts, %text → ends
        const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
        return regex.test(recordVal.toString());
      }

      const eqMatch = condition.match(/^(\w+)\s*=\s*\?$/i);
      if (eqMatch) {
        const col = eqMatch[1];
        const val = args[startArgIndex];
        return record[col] === val;
      }

      const gteMatch = condition.match(/^(\w+)\s*>=\s*\?$/i);
      if (gteMatch) {
        const col = gteMatch[1];
        const val = args[startArgIndex];
        return record[col] >= val;
      }

      const lteMatch = condition.match(/^(\w+)\s*<=\s*\?$/i);
      if (lteMatch) {
        const col = lteMatch[1];
        const val = args[startArgIndex];
        return record[col] <= val;
      }

      const gtMatch = condition.match(/^(\w+)\s*>\s*\?$/i);
      if (gtMatch) {
        const col = gtMatch[1];
        const val = args[startArgIndex];
        return record[col] > val;
      }

      const ltMatch = condition.match(/^(\w+)\s*<\s*\?$/i);
      if (ltMatch) {
        const col = ltMatch[1];
        const val = args[startArgIndex];
        return record[col] < val;
      }

      // Handle "col IS NOT NULL"
      const isNotNullMatch = condition.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
      if (isNotNullMatch) {
        const col = isNotNullMatch[1];
        return record[col] !== null && record[col] !== undefined;
      }

      // Handle "col IS NULL"
      const isNullMatch = condition.match(/^(\w+)\s+IS\s+NULL$/i);
      if (isNullMatch) {
        const col = isNullMatch[1];
        return record[col] === null || record[col] === undefined;
      }

      return true;
    };

    // ── SELECT ───────────────────────────────────────────────────────────────
    if (/^SELECT\s+/i.test(sqlStr)) {
      const fromMatch = sqlStr.match(/FROM\s+(\w+)/i);
      const tableName = fromMatch ? fromMatch[1] : null;
      const countMatch = sqlStr.match(/COUNT\(\*\)\s+as\s+(\w+)/i);

      return {
        run: () => ({ changes: 0 }),
        get: (...args) => {
          if (!tableName || !db.tables[tableName]) return null;

          // COUNT(*) as alias
          if (countMatch) {
            const alias = countMatch[1];
            const records = filterRecords([...db.tables[tableName].values()], sqlStr, args);
            const result = {};
            result[alias] = records.length;
            return result;
          }

          // Regular SELECT with WHERE — return first matching record
          const records = filterRecords([...db.tables[tableName].values()], sqlStr, args);
          return records[0] || null;
        },
        all: (...args) => {
          if (!tableName || !db.tables[tableName]) return [];

          // Apply WHERE filtering
          let records = filterRecords([...db.tables[tableName].values()], sqlStr, args);

          // Apply LIMIT and OFFSET
          const limitMatch = sqlStr.match(/LIMIT\s+\?/i);
          const offsetMatch = sqlStr.match(/OFFSET\s+\?/i);

          if (limitMatch || offsetMatch) {
            // Count placeholders before LIMIT/OFFSET to find the arg indices
            let argIndex = (sqlStr.match(/\?/g) || []).length;

            // Extract LIMIT and OFFSET from end of SQL
            const limitOffsetMatch = sqlStr.match(/LIMIT\s+(\d+|\?)\s+OFFSET\s+(\d+|\?)|OFFSET\s+(\d+|\?)\s+LIMIT\s+(\d+|\?)/i);

            const allQMarks = sqlStr.match(/\?/g) || [];
            if (limitMatch && offsetMatch) {
              // Find which args are limit and offset by parsing from the end
              const limitIdx = allQMarks.length - 2;  // Second to last
              const offsetIdx = allQMarks.length - 1; // Last

              const limit = parseInt(args[limitIdx]) || 50;
              const offset = parseInt(args[offsetIdx]) || 0;
              records = records.slice(offset, offset + limit);
            } else if (limitMatch) {
              const limitIdx = allQMarks.length - 1;
              const limit = parseInt(args[limitIdx]) || 50;
              records = records.slice(0, limit);
            } else if (offsetMatch) {
              const offsetIdx = allQMarks.length - 1;
              const offset = parseInt(args[offsetIdx]) || 0;
              records = records.slice(offset);
            }
          }

          return records;
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
