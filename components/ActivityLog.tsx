import React from 'react';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface ActivityLogProps {
  transactions: Transaction[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ transactions }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full max-h-[600px] flex flex-col">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
        <h3 className="font-semibold text-slate-800">Activity Log</h3>
        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
          {transactions.length} Events
        </span>
      </div>

      <div className="overflow-y-auto flex-grow p-2 space-y-1">
        {transactions.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === TransactionType.DEPOSIT 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    {tx.type === TransactionType.DEPOSIT ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {tx.type === TransactionType.DEPOSIT ? 'Deposit' : 'Withdrawal'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold text-sm ${
                    tx.type === TransactionType.DEPOSIT ? 'text-indigo-600' : 'text-slate-900'
                  }`}>
                    {tx.type === TransactionType.DEPOSIT ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pl-11">
                 <div className="flex items-center gap-1.5">
                    {tx.status === TransactionStatus.PENDING && (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs font-medium text-slate-500">Processing</span>
                      </>
                    )}
                    {tx.status === TransactionStatus.COMPLETED && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600">Confirmed</span>
                      </>
                    )}
                    {tx.status === TransactionStatus.FAILED && (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-600">Failed</span>
                      </>
                    )}
                 </div>
                 
                 {tx.hash && (
                   <a 
                    href={`#tx/${tx.hash}`} 
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
                   >
                     Hash: {tx.hash.substring(0, 6)}...
                     <ExternalLink className="w-2.5 h-2.5" />
                   </a>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};