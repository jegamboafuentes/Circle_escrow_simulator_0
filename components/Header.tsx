import React from 'react';
import { WalletState } from '../types';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect, isConnecting }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-slate-900 font-extrabold text-sm tracking-tight">LB</span>
          </div>
          <span className="font-bold text-slate-900 text-lg hidden sm:block">Lightning Bounties</span>
          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium ml-2 border border-amber-200">
            TESTNET
          </span>
        </div>

        <div>
          {wallet.isConnected ? (
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Connected</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">{wallet.address}</span>
               </div>
               <button 
                onClick={onDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
               >
                 <LogOut className="w-4 h-4" />
                 <span className="hidden sm:inline">Disconnect</span>
               </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed font-semibold"
            >
              {isConnecting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              <span className="font-medium">Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
