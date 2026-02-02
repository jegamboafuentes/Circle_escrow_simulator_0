import { Router } from 'express';
import { validateIssueUrl } from '../lib/github.js';

const router = Router();

// Reserved = sum of amount_usdc for open/claimed funded bounties by this poster (Lightning Bounties style)
router.get('/reserved', (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).json({ error: 'Missing wallet' });
  const row = req.db.prepare(`
    SELECT COALESCE(SUM(amount_usdc), 0) AS reserved FROM bounties
    WHERE poster_wallet = ? AND funded_at IS NOT NULL AND status IN ('open', 'claimed')
  `).get(wallet);
  res.json({ reserved: row ? row.reserved : 0 });
});

router.get('/', (req, res) => {
  const status = req.query.status;
  const myWallet = req.query.my;
  let rows;
  if (myWallet) {
    const stmt = req.db.prepare(
      'SELECT * FROM bounties WHERE poster_wallet = ? OR winner_wallet = ? ORDER BY created_at DESC'
    );
    rows = stmt.all(myWallet, myWallet);
  } else if (status) {
    rows = req.db.prepare('SELECT * FROM bounties WHERE status = ? ORDER BY created_at DESC').all(status);
  } else {
    rows = req.db.prepare('SELECT * FROM bounties ORDER BY created_at DESC').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid bounty id' });
  const stmt = req.db.prepare('SELECT * FROM bounties WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return res.status(404).json({ error: 'Bounty not found' });
  res.json(row);
});

router.post('/:id/fund', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid bounty id' });
  const { amount } = req.body || {};
  const bounty = req.db.prepare('SELECT * FROM bounties WHERE id = ?').get(id);
  if (!bounty) return res.status(404).json({ error: 'Bounty not found' });
  if (bounty.status !== 'open') return res.status(400).json({ error: 'Bounty not open for funding' });
  const amountNum = amount != null ? parseFloat(amount) : bounty.amount_usdc;
  if (Number.isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: 'Invalid amount' });
  req.db.prepare('UPDATE bounties SET funded_at = datetime(\'now\') WHERE id = ?').run(id);
  const row = req.db.prepare('SELECT * FROM bounties WHERE id = ?').get(id);
  res.json(row);
});

// Cancel an open funded bounty (poster only); reserved amount is released (no on-chain refund in this version)
router.post('/:id/cancel', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid bounty id' });
  const posterWallet = req.query.posterWallet || req.body?.posterWallet;
  const bounty = req.db.prepare('SELECT * FROM bounties WHERE id = ?').get(id);
  if (!bounty) return res.status(404).json({ error: 'Bounty not found' });
  if (bounty.status !== 'open') return res.status(400).json({ error: 'Only open bounties can be cancelled' });
  if (!bounty.funded_at) return res.status(400).json({ error: 'Bounty is not funded' });
  if (posterWallet && bounty.poster_wallet.toLowerCase() !== posterWallet.toLowerCase()) {
    return res.status(403).json({ error: 'Only the poster can cancel this bounty' });
  }
  req.db.prepare("UPDATE bounties SET status = 'cancelled', funded_at = NULL WHERE id = ?").run(id);
  const row = req.db.prepare('SELECT * FROM bounties WHERE id = ?').get(id);
  res.json(row);
});

router.post('/', async (req, res) => {
  const { issueUrl, amountUsdc, posterWallet } = req.body || {};
  if (!issueUrl || amountUsdc == null || !posterWallet) {
    return res.status(400).json({ error: 'Missing issueUrl, amountUsdc, or posterWallet' });
  }
  const amount = parseFloat(amountUsdc);
  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amountUsdc must be a positive number' });
  }
  try {
    const validated = await validateIssueUrl(issueUrl);
    const insert = req.db.prepare(`
      INSERT INTO bounties (owner, repo, issue_number, issue_url, issue_title, amount_usdc, poster_wallet, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
    `);
    const result = insert.run(
      validated.owner,
      validated.repo,
      validated.issue_number,
      validated.issue_url,
      validated.issue_title,
      amount,
      posterWallet
    );
    const row = req.db.prepare('SELECT * FROM bounties WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    const message = err.message || 'Failed to create bounty';
    return res.status(400).json({ error: message });
  }
});

export default router;
