import { Router } from 'express';

const router = Router();

// GET /api/me - current user by wallet (query) or session
router.get('/', (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.json({ wallet: null, github: null });
  const stmt = req.db.prepare('SELECT * FROM users WHERE wallet_address = ?');
  const user = stmt.get(wallet);
  if (!user) return res.json({ wallet, github: null });
  res.json({
    wallet: user.wallet_address,
    github: user.github_id ? { id: user.github_id, login: user.github_login } : null,
  });
});

export default router;
