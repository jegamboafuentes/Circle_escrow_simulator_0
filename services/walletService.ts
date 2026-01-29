import { BrowserProvider, Contract, formatUnits, parseUnits, JsonRpcProvider } from 'ethers';
import { TransactionType } from '../types';

// USDC contract addresses
const USDC_CONTRACT_ADDRESSES: Record<string, string> = {
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  amoy: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
};

// RPC URLs
const RPC_URLS: Record<string, string> = {
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-rpc.com',
  amoy: 'https://rpc-amoy.polygon.technology',
};

// 1. ERC20 ABI (For interacting with USDC)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)', 
  'function allowance(address owner, address spender) view returns (uint256)',
];

// 2. ESCROW ABI (For interacting with YOUR contract)
const ESCROW_ABI = [
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function deposits(address account) view returns (uint256)"
];

const getNetwork = (): string => {
  return import.meta.env.VITE_NETWORK || 'sepolia';
};

const getEscrowAddress = (): string => {
  return import.meta.env.VITE_ESCROW_ADDRESS || '0x454dbc4ddf7fd234a03f94c56a7df63c46e7d6b3';
};

export interface WalletConnection {
  address: string;
  provider: BrowserProvider;
  signer: any;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export const isWalletAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
};

export const connectWallet = async (): Promise<WalletConnection> => {
  if (!isWalletAvailable()) {
    throw new Error('No wallet found. Please install MetaMask.');
  }
  const ethereum = (window as any).ethereum;
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) throw new Error('No accounts found.');
    const address = accounts[0];
    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    return { address, provider, signer };
  } catch (error: any) {
    throw new Error(`Failed to connect wallet: ${error.message || error}`);
  }
};

export const getCurrentAccount = async (): Promise<string | null> => {
  if (!isWalletAvailable()) return null;
  const ethereum = (window as any).ethereum;
  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) { return null; }
};

export const getUSDCBalance = async (address: string): Promise<number> => {
  const network = getNetwork();
  const contractAddress = USDC_CONTRACT_ADDRESSES[network];
  const rpcUrl = RPC_URLS[network];
  if (!contractAddress) throw new Error(`USDC contract not configured for ${network}`);

  try {
    // FIX: Removed typo 'HZ'
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(address);
    return parseFloat(formatUnits(balance, decimals));
  } catch (error: any) {
    throw new Error(`Failed to get USDC balance: ${error.message}`);
  }
};

export const getNativeBalance = async (address: string): Promise<number> => {
  const network = getNetwork();
  const rpcUrl = RPC_URLS[network];
  if (!rpcUrl) throw new Error(`RPC URL not configured for ${network}`);
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return parseFloat(formatUnits(balance, 18));
  } catch (error: any) {
    throw new Error(`Failed to get native balance: ${error.message}`);
  }
};

// --- TRANSFER LOGIC ---
export const transferUSDC = async (
  signer: any,
  userAddress: string,
  amount: number,
  type: TransactionType
): Promise<TransactionResult> => {
  const network = getNetwork();
  const usdcAddress = USDC_CONTRACT_ADDRESSES[network];
  const escrowAddress = getEscrowAddress();

  if (!usdcAddress) throw new Error(`USDC contract not configured for ${network}`);
  if (!escrowAddress) throw new Error('Escrow address missing. Check your .env file.');

  try {
    // 1. Setup Contracts
    const usdcContract = new Contract(usdcAddress, ERC20_ABI, signer);
    const escrowContract = new Contract(escrowAddress, ESCROW_ABI, signer);
    
    // 2. Prepare Amount
    const decimals = await usdcContract.decimals();
    const amountInUnits = parseUnits(amount.toString(), decimals);

    let tx;

    if (type === TransactionType.DEPOSIT) {
      // === DEPOSIT FLOW ===
      
      // A. Check USDC Balance
      const balance = await usdcContract.balanceOf(userAddress);
      if (balance < amountInUnits) {
        throw new Error(`Insufficient USDC balance.`);
      }

      // B. Approve Escrow to spend your USDC
      console.log("Approving Escrow Contract...");
      const currentAllowance = await usdcContract.allowance(userAddress, escrowAddress);
      // FIX: Removed typo 'WX'
      if (currentAllowance < amountInUnits) {
          const approveTx = await usdcContract.approve(escrowAddress, amountInUnits);
          await approveTx.wait(); // Wait for approval to mine
          console.log("Approval confirmed.");
      }

      // C. Call Deposit
      console.log("Calling deposit()...");
      tx = await escrowContract.deposit(amountInUnits);

    } else {
      // === WITHDRAW FLOW ===
      console.log("Calling withdraw()...");
      tx = await escrowContract.withdraw(amountInUnits);
    }

    // 3. Wait for Transaction
    // FIX: Removed typo 'HZ'
    const receipt = await tx.wait();
    
    return { hash: receipt.hash, success: true };

  } catch (error: any) {
    console.error("Transaction Error:", error);
    let msg = error.reason || error.message || 'Transaction failed';
    if (msg.includes("user rejected")) msg = "Transaction rejected by user.";
    return { hash: '', success: false, error: msg };
  }
};

export const onAccountChange = (callback: (accounts: string[]) => void) => {
  if (!isWalletAvailable()) return () => {};
  const ethereum = (window as any).ethereum;
  ethereum.on('accountsChanged', callback);
  return () => ethereum.removeListener('accountsChanged', callback);
};

export const onNetworkChange = (callback: (chainId: string) => void) => {
  if (!isWalletAvailable()) return () => {};
  const ethereum = (window as any).ethereum;
  ethereum.on('chainChanged', callback);
  return () => ethereum.removeListener('chainChanged', callback);
};

export const switchToNetwork = async (): Promise<void> => {
  if (!isWalletAvailable()) throw new Error('No wallet found');
  const ethereum = (window as any).ethereum;
  const network = getNetwork();
  
  const chainIds: Record<string, string> = {
    sepolia: '0xaa36a7', // 11155111
    ethereum: '0x1',
    polygon: '0x89',
    amoy: '0x13882',
  };

  const targetChainId = chainIds[network];
  if (!targetChainId) throw new Error(`Network ${network} not supported`);

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902 && network === 'sepolia') {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: targetChainId,
          chainName: 'Sepolia Test Network',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [RPC_URLS.sepolia],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    } else {
      throw switchError;
    }
  }
};