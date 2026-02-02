import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Load .env: try server dir (where this file lives), then server/.env from cwd, then root .env
const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEnv = join(__dirname, '.env');
const serverEnvFromCwd = join(process.cwd(), 'server', '.env');
const rootEnv = join(process.cwd(), '.env');

console.log('[env] cwd:', process.cwd());
console.log('[env] server .env exists (by __dirname):', existsSync(serverEnv));
console.log('[env] server .env exists (by cwd):', existsSync(serverEnvFromCwd));

let result = dotenv.config({ path: serverEnv });
if (result.error) console.log('[env] load serverEnv error:', result.error.message);
if (!process.env.GITHUB_CLIENT_ID) {
  result = dotenv.config({ path: serverEnvFromCwd });
  if (result.error) console.log('[env] load serverEnvFromCwd error:', result.error.message);
}
if (!process.env.GITHUB_CLIENT_ID) {
  result = dotenv.config({ path: rootEnv });
  if (result.error) console.log('[env] load rootEnv error:', result.error.message);
}

import express from 'express';
import { getDb, initSchema } from './db.js';
import authRoutes from './routes/auth.js';
import bountiesRoutes from './routes/bounties.js';
import meRoutes from './routes/me.js';
import jobsRoutes from './routes/jobs.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Log env status at startup (do not log secret values)
console.log('[env] tried:', serverEnv);
console.log('[env] GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.slice(0, 8)}...` : 'NOT SET');
console.log('[env] GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET');
console.log('[env] FRONTEND_URL:', process.env.FRONTEND_URL || '(not set)');
console.log('[env] BACKEND_URL:', process.env.BACKEND_URL || '(not set)');
if (!process.env.GITHUB_CLIENT_ID) {
  console.warn('[env] GITHUB_CLIENT_ID is missing. Add it to server/.env as: GITHUB_CLIENT_ID=your_id (no spaces around =) and restart the server.');
}

const db = getDb();
initSchema(db);

// CORS: allow frontend on 3000 (Vite in this project) and 5173 (Vite default)
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// Attach db to req for routes that need it
app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/bounties', bountiesRoutes);
app.use('/api/me', meRoutes);
app.use('/api/jobs', jobsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', async (req, res) => {
  let fundAddress = process.env.PAYOUT_WALLET_ADDRESS;
  if (!fundAddress && process.env.PAYOUT_WALLET_PRIVATE_KEY) {
    try {
      const { Wallet } = await import('ethers');
      fundAddress = new Wallet(process.env.PAYOUT_WALLET_PRIVATE_KEY).address;
    } catch (_) {}
  }
  res.json({ fundAddress: fundAddress || null });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('CORS: allowing http://localhost:3000 and http://localhost:5173');
});
