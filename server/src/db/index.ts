import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

const resolvedDbPath = path.isAbsolute(config.DB_PATH)
  ? config.DB_PATH
  : path.resolve(projectRoot, config.DB_PATH);

const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(resolvedDbPath);

// Enable Write-Ahead Logging for speed & concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

console.log(`Database connected at ${resolvedDbPath} with WAL mode.`);

// Global statement cache to preserve V8 references under Node v24
const statementCache = new Map<string, any>();

export function getStmt(sql: string) {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = (db as any).__originalPrepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

// Intercept all db.prepare calls to guarantee persistent caching across all modules
const originalPrepare = db.prepare.bind(db);
(db as any).__originalPrepare = originalPrepare;

(db as any).prepare = function (sql: string) {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = originalPrepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
};
