import { Router } from 'express';

const router = Router();

const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/auth/github - redirect to GitHub OAuth (pass wallet in state so we can link after callback)
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${backendUrl}/api/auth/github/callback`;
  console.log('[auth/github] GITHUB_CLIENT_ID:', clientId ? `${clientId.slice(0, 8)}...` : 'undefined');
  console.log('[auth/github] redirect_uri:', redirectUri);
  if (!clientId) {
    console.error('[auth/github] GITHUB_CLIENT_ID not configured - check server/.env and restart server');
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
  }
  const scope = 'read:user';
  const state = req.query.wallet || '';
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

// GET /api/auth/github/callback - exchange code for token, fetch user, store github_id/login linked to wallet
router.get('/github/callback', async (req, res) => {
  const { code, state: walletAddress } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.redirect(`${frontendUrl}?github=error&message=missing_code`);
  }
  if (!clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}?github=error&message=server_config`);
  }

  try {
    const redirectUri = `${backendUrl}/api/auth/github/callback`;
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.redirect(`${frontendUrl}?github=error&message=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userRes.json();
    if (githubUser.message) {
      return res.redirect(`${frontendUrl}?github=error&message=api_failed`);
    }

    const db = req.db;
    const githubId = String(githubUser.id);
    const githubLogin = githubUser.login;

    if (walletAddress) {
      const existing = db.prepare('SELECT id FROM users WHERE wallet_address = ?').get(walletAddress);
      if (existing) {
        db.prepare('UPDATE users SET github_id = ?, github_login = ? WHERE wallet_address = ?').run(githubId, githubLogin, walletAddress);
      } else {
        db.prepare('INSERT INTO users (wallet_address, github_id, github_login) VALUES (?, ?, ?)').run(walletAddress, githubId, githubLogin);
      }
    } else {
      const existing = db.prepare('SELECT id FROM users WHERE github_id = ?').get(githubId);
      if (existing) {
        db.prepare('UPDATE users SET github_login = ? WHERE github_id = ?').run(githubLogin, githubId);
      } else {
        db.prepare('INSERT INTO users (wallet_address, github_id, github_login) VALUES (?, ?, ?)').run('', githubId, githubLogin);
      }
    }

    return res.redirect(`${frontendUrl}?github=linked&login=${encodeURIComponent(githubLogin)}`);
  } catch (err) {
    console.error('GitHub callback error:', err);
    return res.redirect(`${frontendUrl}?github=error&message=unknown`);
  }
});

export default router;
