import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl:
    config.DATABASE_URL.includes('sslmode=require') ||
    config.DATABASE_URL.includes('render.com') ||
    (config.NODE_ENV === 'production' && !config.DATABASE_URL.includes('localhost'))
      ? { rejectUnauthorized: false }
      : undefined,
});

pool.on('error', (err) => {
  console.error('[POSTGRES_POOL_ERROR]', err);
});

console.log(`Database connected via PostgreSQL (${config.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}).`);

export function convertSql(sql: string): string {
  let s = sql;
  // Convert SQLite "INSERT OR IGNORE INTO" to Postgres "INSERT INTO ... ON CONFLICT DO NOTHING"
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) {
    s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(s)) {
      s = s.trimEnd();
      const hasSemi = s.endsWith(';');
      if (hasSemi) s = s.slice(0, -1);
      s += ' ON CONFLICT DO NOTHING' + (hasSemi ? ';' : '');
    }
  }

  // Convert positional ? to $1, $2, $3... (ignoring characters in string literals)
  let paramIdx = 1;
  s = s.replace(/\bdatetime\(([^()]+)\)/gi, '$1');
  return s.replace(/'(?:''|[^'])*'|\?/g, (match) => {
    if (match === '?') {
      return `$${paramIdx++}`;
    }
    return match;
  });
}

export function sanitizeParams(params: any[]): any[] {
  // If params was passed as an array inside the args, unwrap it
  const list = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  return list.map((val) => {
    if (val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });
}

export interface PreparedStatement {
  get<T = any>(...params: any[]): Promise<T | undefined>;
  all<T = any>(...params: any[]): Promise<T[]>;
  run(...params: any[]): Promise<{ changes: number }>;
}

export const db = {
  prepare(sql: string): PreparedStatement {
    const pgSql = convertSql(sql);
    return {
      async get<T = any>(...params: any[]): Promise<T | undefined> {
        const cleanParams = sanitizeParams(params);
        const result = await pool.query(pgSql, cleanParams);
        return (result.rows[0] as T) || undefined;
      },
      async all<T = any>(...params: any[]): Promise<T[]> {
        const cleanParams = sanitizeParams(params);
        const result = await pool.query(pgSql, cleanParams);
        return result.rows as T[];
      },
      async run(...params: any[]): Promise<{ changes: number }> {
        const cleanParams = sanitizeParams(params);
        const result = await pool.query(pgSql, cleanParams);
        return { changes: result.rowCount ?? 0 };
      },
    };
  },

  async exec(sql: string): Promise<void> {
    await pool.query(sql);
  },

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const cleanParams = sanitizeParams(params);
    const result = await pool.query(convertSql(sql), cleanParams);
    return result.rows as T[];
  },

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const cleanParams = sanitizeParams(params);
    const result = await pool.query(convertSql(sql), cleanParams);
    return (result.rows[0] as T) || undefined;
  },

  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const cleanParams = sanitizeParams(params);
    const result = await pool.query(convertSql(sql), cleanParams);
    return { changes: result.rowCount ?? 0 };
  },

  async close(): Promise<void> {
    await pool.end();
  },
};

export function getStmt(sql: string): PreparedStatement {
  return db.prepare(sql);
}
