import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

const resolvedDbPath = path.isAbsolute(config.DB_PATH)
  ? config.DB_PATH
  : path.resolve(process.cwd(), config.DB_PATH);

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
