import React, { useState } from 'react';
import { createBounty, getConfig, fundBounty, type Bounty } from '../services/api';
import { DollarSign, Github, ExternalLink, CheckCircle, Copy } from 'lucide-react';

interface PostBountyProps {
  walletAddress: string;
  onCreated?: (bounty: Bounty) => void;
  onFunded?: () => void;
}

export const PostBounty: React.FC<PostBountyProps> = ({ walletAddress, onCreated, onFunded }) => {
  const [issueUrl, setIssueUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [created, setCreated] = useState<Bounty | null>(null);
  const [fundAddress, setFundAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!issueUrl.trim() || Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid GitHub issue URL and USDC amount.');
      return;
    }
    setLoading(true);
    try {
      const bounty = await createBounty({
        issueUrl: issueUrl.trim(),
        amountUsdc: amt,
        posterWallet: walletAddress,
      });
      setCreated(bounty);
      const config = await getConfig();
      setFundAddress(config.fundAddress);
      onCreated?.(bounty);
    } catch (err: any) {
      setError(err.message || 'Failed to create bounty');
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    if (!created) return;
    setError(null);
    setFunding(true);
    try {
      const updated = await fundBounty(created.id);
      setCreated(updated);
      onFunded?.();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as funded');
    } finally {
      setFunding(false);
    }
  };

  const copyAddress = () => {
    if (fundAddress) navigator.clipboard.writeText(fundAddress);
  };

  if (created && created.funded_at) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 text-emerald-700 mb-2">
          <CheckCircle className="w-6 h-6" />
          <span className="font-semibold">Bounty funded</span>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          <a href={created.issue_url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline inline-flex items-center gap-1">
            {created.owner}/{created.repo}#{created.issue_number}
            <ExternalLink className="w-3 h-3" />
          </a>
          {' '}– ${created.amount_usdc} USDC. When a PR that closes this issue is merged, the developer gets paid.
        </p>
        <p className="text-xs text-slate-500">
          Developers: include <code className="bg-slate-100 px-1 rounded">close #{created.issue_number}</code> in your PR description so the issue is linked and you can receive the payout.
        </p>
        <button
          type="button"
          onClick={() => { setCreated(null); setIssueUrl(''); setAmount(''); setFundAddress(null); }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Post another bounty
        </button>
      </div>
    );
  }

  if (created) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Fund this bounty</h3>
        <p className="text-slate-600 text-sm mb-4">
          Send <strong>${created.amount_usdc} USDC</strong> to the address below. After sending, click &quot;I&apos;ve sent&quot; to lock the bounty.
        </p>
        {fundAddress ? (
          <div className="flex items-center gap-2 mb-4">
            <code className="flex-1 text-xs bg-slate-100 px-3 py-2 rounded-lg break-all font-mono">
              {fundAddress}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-amber-700 text-sm mb-4">Server fund address not configured. Contact support.</p>
        )}
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleFund}
            disabled={funding}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-medium disabled:opacity-70"
          >
            {funding ? '...' : "I've sent the USDC"}
          </button>
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Github className="w-5 h-5" />
        Post a bounty
      </h3>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">GitHub issue URL</label>
          <input
            type="url"
            value={issueUrl}
            onChange={(e) => setIssueUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/issues/42"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (USDC)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
              }}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <span className="animate-pulse">Creating...</span>
          ) : (
            <>
              <DollarSign className="w-4 h-4" />
              Create bounty
            </>
          )}
        </button>
      </form>
    </div>
  );
};
