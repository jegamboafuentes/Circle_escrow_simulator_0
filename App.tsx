import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EscrowDashboard } from './components/EscrowDashboard';
import { WalletConnect } from './components/WalletConnect';
import { ActivityLog } from './components/ActivityLog';
import { WalletState, Transaction, TransactionType, TransactionStatus } from './types';
import {
  connectWallet,
  getUSDCBalance,
  getNativeBalance,
  transferUSDC,
  getCurrentAccount,
  onAccountChange,
  onNetworkChange,
  switchToNetwork,
  isWalletAvailable,
  type WalletConnection,
} from './services/walletService';
import { ShieldCheck, Wallet } from 'lucide-react';

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: 0.00,
    escrowBalance: 0.00,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletConnection, setWalletConnection] = useState<WalletConnection | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (isWalletAvailable()) {
        const account = await getCurrentAccount();
        if (account) {
          await handleConnect();
        }
      }
    };
    checkConnection();
  }, []);

  // Set up wallet event listeners
  useEffect(() => {
    if (!isWalletAvailable()) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else if (wallet.isConnected && accounts[0] !== wallet.address) {
        await handleConnect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const removeAccountListener = onAccountChange(handleAccountsChanged);
    const removeChainListener = onNetworkChange(handleChainChanged);

    return () => {
      removeAccountListener();
      removeChainListener();
    };
  }, [wallet.isConnected, wallet.address]);

  // Update balances when wallet is connected
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      updateBalances();
      // Poll balances every 10 seconds
      const interval = setInterval(updateBalances, 10000);
      return () => clearInterval(interval);
    }
  }, [wallet.isConnected, wallet.address]);

  const updateBalances = async () => {
    if (!wallet.address) return;

    try {
      const [usdcBalance, nativeBalance] = await Promise.all([
        getUSDCBalance(wallet.address),
        getNativeBalance(wallet.address),
      ]);

      // For escrow balance, we'll track it locally since we don't have a real escrow contract
      // In a production app, you'd query the escrow contract for the user's balance
      setWallet(prev => ({
        ...prev,
        balance: usdcBalance,
        // escrowBalance is tracked locally based on transactions
      }));
    } catch (error: any) {
      console.error('Failed to update balances:', error);
    }
  };

  const handleConnect = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Switch to correct network
      await switchToNetwork();

      // Connect wallet
      const connection = await connectWallet();
      setWalletConnection(connection);

      // Get initial balances
      const [usdcBalance] = await Promise.all([
        getUSDCBalance(connection.address),
      ]);

      setWallet({
        isConnected: true,
        address: connection.address,
        balance: usdcBalance,
        escrowBalance: 0.00, // Start with 0, will be updated based on transactions
      });
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
      console.error('Connection error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnect = () => {
    setWallet({
      isConnected: false,
      address: null,
      balance: 0.00,
      escrowBalance: 0.00,
    });
    setWalletConnection(null);
    setTransactions([]);
    setError(null);
  };

  const handleTransaction = async (type: TransactionType, amount: number) => {
    if (!wallet.isConnected || !walletConnection) {
      setError('Wallet not connected');
      return;
    }

    setIsProcessing(true);
    setError(null);

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
      // Execute real USDC transfer
      const result = await transferUSDC(walletConnection.signer, wallet.address!, amount, type);

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      // Update balances
      if (type === TransactionType.DEPOSIT) {
        setWallet(prev => ({
          ...prev,
          balance: prev.balance - amount,
          escrowBalance: prev.escrowBalance + amount,
        }));
      } else {
        // For withdrawals, we'd need escrow contract integration
        // For now, we'll just update the local state
        setWallet(prev => ({
          ...prev,
          balance: prev.balance + amount,
          escrowBalance: prev.escrowBalance - amount,
        }));
      }

      // Update transaction status
      setTransactions(prev => prev.map(tx =>
        tx.id === newTx.id
          ? { ...tx, status: TransactionStatus.COMPLETED, hash: result.hash }
          : tx
      ));

      // Refresh balances after a short delay
      setTimeout(updateBalances, 2000);
    } catch (error: any) {
      console.error('Transaction failed', error);
      setError(error.message || 'Transaction failed');
      setTransactions(prev => prev.map(tx =>
        tx.id === newTx.id
          ? { ...tx, status: TransactionStatus.FAILED }
          : tx
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

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!wallet.isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-indigo-50 p-4 rounded-full mb-6">
              <Wallet className="w-12 h-12 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Connect your Wallet</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
              Connect your MetaMask or other Web3 wallet to explore Lightning Bounties escrow deposit and withdrawal flows on Sepolia testnet.
            </p>
            {!isWalletAvailable() && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm max-w-md">
                No Web3 wallet detected. Please install <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline">MetaMask</a> or another Web3 wallet.
              </div>
            )}
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


