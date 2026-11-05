import path from 'path';
import { fileURLToPath } from 'url';
import { MIGRATIONS } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database access.
 *
 * - DATABASE_URL set  -> real Postgres via `pg` (Supabase, Neon, RDS, ...). Required in production.
 * - DATABASE_URL unset -> embedded Postgres (PGlite) for local development and tests:
 *   stored in server/storage/pglite (or PGLITE_DIR), in memory under NODE_ENV=test.
 *
 * Both expose the same small interface:
 *   query(sql, params) -> { rows }
 *   tx(async (q) => ...) runs q.query(...) calls in one transaction
 */
let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = connect().catch((err) => {
      dbPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return dbPromise;
}

export async function query(sql, params) {
  const db = await getDb();
  return db.query(sql, params);
}

export async function tx(fn) {
  const db = await getDb();
  return db.tx(fn);
}

export async function closeDb() {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  dbPromise = null;
  await db?.close();
}

async function connect() {
  const db = process.env.DATABASE_URL ? await connectPostgres() : await connectPglite();
  await migrate(db);
  return db;
}

async function connectPostgres() {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));

  return {
    kind: 'postgres',
    query: (sql, params) => pool.query(sql, params),
    exec: (sql) => pool.query(sql),
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (sql, params) => client.query(sql, params) });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}

async function connectPglite() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL must be set in production (the embedded database is for development only)');
  }
  let PGlite;
  try {
    ({ PGlite } = await import('@electric-sql/pglite'));
  } catch {
    throw new Error('DATABASE_URL is not set and the dev-only embedded database (@electric-sql/pglite) is not installed');
  }
  const dataDir = process.env.NODE_ENV === 'test'
    ? undefined // in-memory
    : (process.env.PGLITE_DIR || path.join(__dirname, '../storage/pglite'));
  const pg = new PGlite(dataDir);
  await pg.waitReady;

  return {
    kind: 'pglite',
    query: (sql, params) => pg.query(sql, params),
    exec: (sql) => pg.exec(sql),
    tx: (fn) => pg.transaction((t) => fn({ query: (sql, params) => t.query(sql, params) })),
    close: () => pg.close()
  };
}

async function migrate(db) {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS roadready;
    CREATE TABLE IF NOT EXISTS roadready.schema_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  for (const m of MIGRATIONS) {
    const applied = await db.tx(async (q) => {
      // Serialise migrations across server instances starting at the same time.
      await q.query('SELECT pg_advisory_xact_lock(7262001)');
      const { rows } = await q.query('SELECT 1 FROM roadready.schema_migrations WHERE version = $1', [m.version]);
      if (rows.length > 0) return false;
      // Statements run one by one so both drivers accept them inside a transaction.
      for (const statement of splitSql(m.sql)) {
        await q.query(statement);
      }
      await q.query('INSERT INTO roadready.schema_migrations (version, name) VALUES ($1, $2)', [m.version, m.name]);
      return true;
    });
    if (applied && process.env.NODE_ENV !== 'test') {
      console.log(`[db] applied migration ${m.version}: ${m.name}`);
    }
  }
}

// Migrations contain only plain DDL (no functions or string literals with ';').
function splitSql(sql) {
  return sql.split(';').map((s) => s.trim()).filter(Boolean);
}
