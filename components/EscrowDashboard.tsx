import React, { useState } from 'react';
import { WalletState, TransactionType } from '../types';
import { ArrowDownLeft, ArrowUpRight, DollarSign, Lock, AlertCircle } from 'lucide-react';

interface EscrowDashboardProps {
  wallet: WalletState;
  onTransaction: (type: TransactionType, amount: number) => void;
  isProcessing: boolean;
}

export const EscrowDashboard: React.FC<EscrowDashboardProps> = ({ wallet, onTransaction, isProcessing }) => {
  const [amount, setAmount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const maxAmount = activeTab === 'deposit' ? wallet.balance : wallet.escrowBalance;
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  };

  const handleSetMax = () => {
    setAmount(maxAmount.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (val > maxAmount) return;

    onTransaction(
      activeTab === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
      val
    );
    setAmount('');
  };

  const isDeposit = activeTab === 'deposit';

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wallet Balance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">External Wallet</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </div>
        </div>

        {/* Escrow Balance */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Lock className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">Escrow Balance</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">
            ${wallet.escrowBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-indigo-300 bg-indigo-500/20 w-fit px-2 py-1 rounded border border-indigo-500/30">
            <Lock className="w-3 h-3" />
            Locked in Contract
          </div>
        </div>
      </div>

      {/* Action Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              isDeposit ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit to Escrow
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              !isDeposit ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw Funds
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Amount (USDC)
            </label>
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 font-semibold">$</span>
              </div>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                disabled={isProcessing}
                className="block w-full pl-8 pr-20 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg font-medium placeholder:text-slate-300"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-slate-500 mb-8">
              <span>Available to {isDeposit ? 'deposit' : 'withdraw'}:</span>
              <span className="font-mono font-medium text-slate-700">
                ${maxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isDeposit ? (
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 mb-6">
                 <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                 <p className="text-xs text-blue-800 leading-relaxed">
                   Depositing moves funds from your external wallet into the secure Escrow Smart Contract. These funds can be programmed for release based on conditional logic.
                 </p>
               </div>
            ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 mb-6">
                 <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                 <p className="text-xs text-amber-800 leading-relaxed">
                   Withdrawing returns funds from the Escrow Smart Contract back to your connected external wallet.
                 </p>
               </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
              className={`w-full py-3.5 rounded-xl font-semibold shadow-sm text-white flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                isProcessing 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : isDeposit 
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' 
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
              }`}
            >
              {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isProcessing ? 'Processing...' : (isDeposit ? 'Deposit Funds' : 'Withdraw Funds')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};