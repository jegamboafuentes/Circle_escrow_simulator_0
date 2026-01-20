import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EscrowDashboard } from './components/EscrowDashboard';
import { WalletConnect } from './components/WalletConnect';
import { ActivityLog } from './components/ActivityLog';
import { WalletState, Transaction, TransactionType, TransactionStatus } from './types';
import { simulateTransaction } from './services/mockSdk';
import { ArrowRightLeft, ShieldCheck, Wallet } from 'lucide-react';

const INITIAL_WALLET_BALANCE = 5000.00;

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: INITIAL_WALLET_BALANCE,
    escrowBalance: 0.00,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-connect for demo purposes if desired, or keep manual
  useEffect(() => {
    // Initial load logic could go here
  }, []);

  const handleConnect = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setWallet(prev => ({
        ...prev,
        isConnected: true,
        address: "0x71C...9A23",
      }));
      setIsProcessing(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    setWallet({
      isConnected: false,
      address: null,
      balance: INITIAL_WALLET_BALANCE,
      escrowBalance: 0.00,
    });
    setTransactions([]);
  };

  const handleTransaction = async (type: TransactionType, amount: number) => {
    if (!wallet.isConnected) return;
    
    setIsProcessing(true);
    
    // Create pending transaction
    const newTx: Transaction = {
      id: Math.random().toString(36).substring(7),
      type,
      amount,
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
    };
    
    setTransactions(prev => [newTx, ...prev]);

    try {
      // Simulate API call
      await simulateTransaction(type, amount);

      // Update balances on success
      setWallet(prev => {
        if (type === TransactionType.DEPOSIT) {
          return {
            ...prev,
            balance: prev.balance - amount,
            escrowBalance: prev.escrowBalance + amount
          };
        } else {
          return {
            ...prev,
            balance: prev.balance + amount,
            escrowBalance: prev.escrowBalance - amount
          };
        }
      });

      // Update transaction status
      setTransactions(prev => prev.map(tx => 
        tx.id === newTx.id ? { ...tx, status: TransactionStatus.COMPLETED, hash: "0x" + Math.random().toString(36).substring(2, 15) } : tx
      ));

    } catch (error) {
      console.error("Transaction failed", error);
      setTransactions(prev => prev.map(tx => 
        tx.id === newTx.id ? { ...tx, status: TransactionStatus.FAILED } : tx
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-800">
      <Header 
        wallet={wallet} 
        onConnect={handleConnect} 
        onDisconnect={handleDisconnect}
        isConnecting={isProcessing && !wallet.isConnected}
      />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-3">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
            Lightning Bounties - Circle SDK Escrow Test
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Run Circle SDK escrow flows in a Lightning Bounties-branded sandbox. 
            Move test funds between your connected wallet and the escrow contract to simulate bounty payouts.
          </p>
        </div>

        {!wallet.isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-indigo-50 p-4 rounded-full mb-6">
              <Wallet className="w-12 h-12 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Connect your Wallet</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
              Connect a simulated Ethereum wallet to explore Lightning Bounties escrow deposit and withdrawal flows.
            </p>
            <WalletConnect onConnect={handleConnect} isLoading={isProcessing} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <EscrowDashboard 
                wallet={wallet} 
                onTransaction={handleTransaction}
                isProcessing={isProcessing}
              />
            </div>
            
            <div className="lg:col-span-1">
              <ActivityLog transactions={transactions} />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          <p>\u00A9 2026 Lightning Bounties Escrow Test. Circle APIs used</p>
        </div>
      </footer>
    </div>
  );
}

export default App;


