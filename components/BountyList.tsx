import React, { useState, useEffect } from 'react';
import { getBounties, cancelBounty, runCheckPrsJob, runPayoutsJob, type Bounty } from '../services/api';
import { ExternalLink, Github, DollarSign, XCircle } from 'lucide-react';

type StatusFilter = 'open' | 'claimed' | 'paid_out' | 'cancelled' | '';
const network = import.meta.env.VITE_NETWORK || 'sepolia';
const explorerTxUrl = network === 'sepolia'
  ? (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`
  : (hash: string) => `https://etherscan.io/tx/${hash}`;

interface BountyListProps {
  walletAddress?: string | null;
  onBountyChange?: () => void;
}

export const BountyList: React.FC<BountyListProps> = ({ walletAddress, onBountyChange }) => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [myOnly, setMyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [jobRunning, setJobRunning] = useState<string | null>(null);

  const refetch = () => {
    getBounties({
      ...(filter ? { status: filter } : {}),
      ...(myOnly && walletAddress ? { my: walletAddress } : {}),
    }).then(setBounties).catch((err) => setError(err.message));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLoading(true);
    setError(null);
    getBounties({
      ...(filter ? { status: filter } : {}),
      ...(myOnly && walletAddress ? { my: walletAddress } : {}),
    })
      .then(setBounties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter, myOnly, walletAddress]);

  const handleRunCheckPrs = async () => {
    setJobRunning('check-prs');
    setError(null);
    try {
      const r = await runCheckPrsJob();
      refetch();
      if (r.claimed != null && r.claimed > 0) setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJobRunning(null);
    }
  };
  const handleRunPayouts = async () => {
    setJobRunning('payouts');
    setError(null);
    try {
      await runPayoutsJob();
      refetch();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJobRunning(null);
    }
  };

  const handleCancel = async (b: Bounty) => {
    if (!walletAddress || b.poster_wallet.toLowerCase() !== walletAddress.toLowerCase()) return;
    setCancellingId(b.id);
    setError(null);
    try {
      await cancelBounty(b.id, walletAddress);
      refetch();
      onBountyChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Github className="w-5 h-5" />
          Bounties
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {walletAddress && (
            <button
              type="button"
              onClick={() => setMyOnly(!myOnly)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                myOnly ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My bounties
            </button>
          )}
          {(['open', 'claimed', 'paid_out', 'cancelled', ''] as const).map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === s
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        )}
        {error && (
          <div className="p-4 text-red-600 text-sm">{error}</div>
        )}
        {!loading && !error && bounties.length === 0 && (
          <div className="p-6 text-center text-slate-500">
            No bounties yet.
            {walletAddress && (
              <p className="text-xs mt-2">To earn USDC: connect GitHub, open a PR that closes the issue (use <code className="bg-slate-100 px-1 rounded">close #N</code> in the PR body), and get it merged.</p>
            )}
          </div>
        )}
        {!loading && !error && bounties.map((b) => (
          <div key={b.id} className="p-4 hover:bg-slate-50/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <a
                  href={b.issue_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 hover:text-amber-600 inline-flex items-center gap-1"
                >
                  {b.issue_title || `${b.owner}/${b.repo}#${b.issue_number}`}
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
                <p className="text-xs text-slate-500 mt-0.5">
                  {b.owner}/{b.repo} #{b.issue_number}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <DollarSign className="w-4 h-4" />
                  {b.amount_usdc}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    b.status === 'open'
                      ? 'bg-emerald-100 text-emerald-800'
                      : b.status === 'claimed'
                        ? 'bg-amber-100 text-amber-800'
                        : b.status === 'cancelled'
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {b.status}
                </span>
              </div>
            </div>
            {b.funded_at && b.status === 'open' && (
              <p className="text-xs text-slate-500 mt-1">Funded</p>
            )}
            {walletAddress && b.status === 'open' && b.funded_at && b.poster_wallet.toLowerCase() === walletAddress.toLowerCase() && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => handleCancel(b)}
                  disabled={cancellingId === b.id}
                  className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {cancellingId === b.id ? 'Cancelling...' : 'Cancel bounty'}
                </button>
              </div>
            )}
            {b.status === 'paid_out' && b.paid_at && (
              <p className="text-xs mt-1">
                <span className="text-slate-500">Paid {new Date(b.paid_at).toLocaleDateString()}</span>
                {walletAddress && b.winner_wallet?.toLowerCase() === walletAddress.toLowerCase() && (
                  <span className="ml-2 text-emerald-600 font-medium">
                    Paid out to you
                    {b.payout_tx_hash && (
                      <a
                        href={explorerTxUrl(b.payout_tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center text-emerald-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>PR merged but no payout?</span>
        <span>Developer must connect GitHub before merging.</span>
        <button
          type="button"
          onClick={handleRunCheckPrs}
          disabled={!!jobRunning}
          className="px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
        >
          {jobRunning === 'check-prs' ? '...' : 'Check merged PRs'}
        </button>
        <button
          type="button"
          onClick={handleRunPayouts}
          disabled={!!jobRunning}
          className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
        >
          {jobRunning === 'payouts' ? '...' : 'Run payouts'}
        </button>
      </div>
    </div>
  );
};
