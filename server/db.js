import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getDb() {
  const path = process.env.DATABASE_PATH || join(__dirname, 'data', 'bounties.db');
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL UNIQUE,
      github_id TEXT,
      github_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bounties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      issue_number INTEGER NOT NULL,
      issue_url TEXT NOT NULL,
      issue_title TEXT,
      amount_usdc REAL NOT NULL,
      poster_wallet TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      funded_at TEXT,
      winner_github_id TEXT,
      winner_wallet TEXT,
      winning_pr_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT,
      UNIQUE(owner, repo, issue_number)
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bounty_id INTEGER NOT NULL,
      to_address TEXT NOT NULL,
      amount_usdc REAL NOT NULL,
      tx_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    );

    CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
    CREATE INDEX IF NOT EXISTS idx_bounties_poster ON bounties(poster_wallet);
    CREATE INDEX IF NOT EXISTS idx_users_github_login ON users(github_login);
  `);
  try {
    db.exec('ALTER TABLE bounties ADD COLUMN funded_at TEXT');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE bounties ADD COLUMN payout_tx_hash TEXT');
  } catch (_) {}
}
