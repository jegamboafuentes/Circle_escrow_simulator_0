/**
 * Job: for each open bounty, check if the GitHub issue was closed by a merged PR.
 * If so, resolve winner (PR author), update bounty to claimed, and trigger payout (see payout job).
 * Run on schedule: node jobs/checkMergedPRs.js or via cron or POST /api/jobs/check-prs.
 */
import 'dotenv/config';
import { getDb } from '../db.js';

const GITHUB_API = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN;

function headers() {
  const h = { Accept: 'application/vnd.github.v3+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`);
  return res.json();
}

async function getIssue(owner, repo, issueNumber) {
  return fetchJson(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`);
}

async function getTimeline(owner, repo, issueNumber) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/timeline?per_page=100`,
    { headers: headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

async function getPullsForCommit(owner, repo, commitSha) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits/${commitSha}/pulls`,
    { headers: headers() }
  );
  if (res.status === 404) return [];
  if (!res.ok) return [];
  return res.json();
}

async function getPull(owner, repo, prNumber) {
  return fetchJson(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`);
}

async function checkBounty(db, bounty) {
  const { id, owner, repo, issue_number } = bounty;
  try {
    const issue = await getIssue(owner, repo, issue_number);
    if (!issue || issue.state !== 'closed') return;

    const timeline = await getTimeline(owner, repo, issue_number);
    const closedEvent = timeline.find((e) => e.event === 'closed' && e.commit_id);
    if (!closedEvent) return;

    const pulls = await getPullsForCommit(owner, repo, closedEvent.commit_id);
    if (!pulls || pulls.length === 0) return;

    const prNumber = typeof pulls[0].number === 'number' ? pulls[0].number : pulls[0].number;
    const pr = await getPull(owner, repo, prNumber);
    if (!pr || !pr.merged) return;

    const winnerLogin = pr.user?.login;
    if (!winnerLogin) return;

    const user = db.prepare('SELECT wallet_address FROM users WHERE github_login = ?').get(winnerLogin);
    if (!user || !user.wallet_address) return;

    db.prepare(`
      UPDATE bounties SET status = 'claimed', winner_github_id = ?, winner_wallet = ?, winning_pr_number = ?
      WHERE id = ?
    `).run(String(pr.user?.id || ''), user.wallet_address, prNumber, id);

    console.log(`Bounty ${id}: winner @${winnerLogin} (${user.wallet_address}), PR #${prNumber}`);
  } catch (err) {
    console.error(`Bounty ${id} check failed:`, err.message);
  }
}

export async function runCheckMergedPRs() {
  const db = getDb();
  const bounties = db.prepare("SELECT id, owner, repo, issue_number FROM bounties WHERE status = 'open'").all();
  let claimed = 0;
  for (const bounty of bounties) {
    const before = db.prepare('SELECT status FROM bounties WHERE id = ?').get(bounty.id);
    await checkBounty(db, bounty);
    const after = db.prepare('SELECT status FROM bounties WHERE id = ?').get(bounty.id);
    if (after?.status === 'claimed' && before?.status === 'open') claimed++;
  }
  return { checked: bounties.length, claimed };
}

if (process.argv[1]?.includes('checkMergedPRs')) {
  runCheckMergedPRs().then((r) => console.log('Done:', r)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
