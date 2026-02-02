const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface MeResponse {
  wallet: string | null;
  github: { id: string; login: string } | null;
}

export async function getMe(walletAddress: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/api/me?wallet=${encodeURIComponent(walletAddress)}`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export function getGitHubConnectUrl(walletAddress: string): string {
  return `${API_BASE}/api/auth/github?wallet=${encodeURIComponent(walletAddress)}`;
}

export async function getBounties(params?: { status?: string; my?: string }): Promise<Bounty[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.my) search.set('my', params.my);
  const q = search.toString() ? `?${search}` : '';
  const res = await fetch(`${API_BASE}/api/bounties${q}`);
  if (!res.ok) throw new Error('Failed to fetch bounties');
  return res.json();
}

export async function getBounty(id: number): Promise<Bounty> {
  const res = await fetch(`${API_BASE}/api/bounties/${id}`);
  if (!res.ok) throw new Error('Failed to fetch bounty');
  return res.json();
}

export async function createBounty(data: { issueUrl: string; amountUsdc: number; posterWallet: string }): Promise<Bounty> {
  const res = await fetch(`${API_BASE}/api/bounties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create bounty');
  }
  return res.json();
}

export interface Bounty {
  id: number;
  owner: string;
  repo: string;
  issue_number: number;
  issue_url: string;
  issue_title: string | null;
  amount_usdc: number;
  poster_wallet: string;
  status: 'open' | 'claimed' | 'paid_out' | 'expired' | 'cancelled';
  funded_at: string | null;
  winner_github_id: string | null;
  winner_wallet: string | null;
  winning_pr_number: number | null;
  payout_tx_hash: string | null;
  created_at: string;
  paid_at: string | null;
}

export async function getReserved(walletAddress: string): Promise<{ reserved: number }> {
  const res = await fetch(`${API_BASE}/api/bounties/reserved?wallet=${encodeURIComponent(walletAddress)}`);
  if (!res.ok) throw new Error('Failed to fetch reserved');
  return res.json();
}

export async function cancelBounty(id: number, posterWallet: string): Promise<Bounty> {
  const res = await fetch(`${API_BASE}/api/bounties/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posterWallet }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel bounty');
  }
  return res.json();
}

/** Run the "check merged PRs" job (marks bounties as claimed when PR is merged). */
export async function runCheckPrsJob(): Promise<{ ok: boolean; checked?: number; claimed?: number }> {
  const res = await fetch(`${API_BASE}/api/jobs/check-prs`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Job failed');
  return data;
}

/** Run the payouts job (sends USDC to winners for claimed bounties). */
export async function runPayoutsJob(): Promise<{ ok: boolean; paid?: number }> {
  const res = await fetch(`${API_BASE}/api/jobs/run-payouts`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Job failed');
  return data;
}

export async function getConfig(): Promise<{ fundAddress: string | null }> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function fundBounty(id: number): Promise<Bounty> {
  const res = await fetch(`${API_BASE}/api/bounties/${id}/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fund bounty');
  }
  return res.json();
}
