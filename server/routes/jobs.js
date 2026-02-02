import { Router } from 'express';
import { runCheckMergedPRs } from '../jobs/checkMergedPRs.js';
import { runPayouts } from '../jobs/runPayouts.js';

const router = Router();

// POST /api/jobs/check-prs - run the "merged PR" check (marks bounties as claimed when PR is merged)
router.post('/check-prs', async (req, res) => {
  try {
    const result = await runCheckMergedPRs();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('check-prs job error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/jobs/run-payouts - send USDC to winners for claimed bounties
router.post('/run-payouts', async (req, res) => {
  try {
    const result = await runPayouts();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('run-payouts job error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
