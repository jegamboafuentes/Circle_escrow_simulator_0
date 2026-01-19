import React from 'react';
import { ArrowRight } from 'lucide-react';

interface WalletConnectProps {
  onConnect: () => void;
  isLoading: boolean;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, isLoading }) => {
  return (
    <div className="w-full max-w-sm">
      <button
        onClick={onConnect}
        disabled={isLoading}
        className="w-full group relative flex items-center justify-between p-4 bg-white border border-slate-300 hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 rounded-xl transition-all shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
             <img src="https://picsum.photos/40/40?random=1" className="w-6 h-6 rounded-full opacity-80" alt="Metamask" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-900">Browser Wallet</div>
            <div className="text-xs text-slate-500">Metamask, Coinbase, etc.</div>
          </div>
        </div>
        {isLoading ? (
             <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        ) : (
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        )}
      </button>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-400">
          By connecting, you agree to the Terms of Service for this testing environment.
        </p>
      </div>
    </div>
  );
};