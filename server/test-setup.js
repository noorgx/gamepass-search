// Mock better-sqlite3 for testing with a pure JavaScript implementation
// This is a workaround for NODE_MODULE_VERSION mismatch in test environment
const Module = require('module');
const originalRequire = Module.prototype.require;

// Simple in-memory SQLite mock using JavaScript
class MockDatabase {
  constructor(path) {
    this.path = path;
    this.tables = {};
    this.tableSchemas = {};
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

      // Parse columns
      const columns = [];
      const colRegex = /(\w+)\s+(\w+[^,]*)/g;
      let colMatch;
      while ((colMatch = colRegex.exec(tableDef)) !== null) {
        columns.push({
          name: colMatch[1].trim(),
          type: colMatch[2].trim()
        });
      }

      this.tables[tableName] = [];
      this.tableSchemas[tableName] = columns;
    }
    return this;
  }

  prepare(sql) {
    return {
      run: () => ({ changes: 0 }),
      all: () => [],
      get: () => null
    };
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
