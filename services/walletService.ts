import { BrowserProvider, Contract, formatUnits, parseUnits, JsonRpcProvider } from 'ethers';
import { TransactionType } from '../types';

// USDC contract addresses for different networks
const USDC_CONTRACT_ADDRESSES: Record<string, string> = {
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  amoy: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
};

// RPC URLs for different networks
const RPC_URLS: Record<string, string> = {
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-rpc.com',
  amoy: 'https://rpc-amoy.polygon.technology',
};

// ERC20 ABI for USDC functions
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Get network from environment or default to sepolia testnet
const getNetwork = (): string => {
  return import.meta.env.VITE_NETWORK || 'sepolia';
};

// Get escrow contract address from environment (or use a default test address)
const getEscrowAddress = (): string => {
  return import.meta.env.VITE_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000';
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

/**
 * Check if MetaMask or another browser wallet is available
 */
export const isWalletAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
};

/**
 * Connect to browser wallet (MetaMask, Coinbase Wallet, etc.)
 */
export const connectWallet = async (): Promise<WalletConnection> => {
  if (!isWalletAvailable()) {
    throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
  }

  const ethereum = (window as any).ethereum;
  
  try {
    // Request account access
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet.');
    }

    const address = accounts[0];
    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    return { address, provider, signer };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request.');
    }
    throw new Error(`Failed to connect wallet: ${error.message || error}`);
  }
};

/**
 * Get the current connected account
 */
export const getCurrentAccount = async (): Promise<string | null> => {
  if (!isWalletAvailable()) {
    return null;
  }

  const ethereum = (window as any).ethereum;
  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Get USDC balance for an address
 */
export const getUSDCBalance = async (address: string): Promise<number> => {
  const network = getNetwork();
  const contractAddress = USDC_CONTRACT_ADDRESSES[network];
  const rpcUrl = RPC_URLS[network];

  if (!contractAddress) {
    throw new Error(`USDC contract not configured for network: ${network}`);
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, ERC20_ABI, provider);
    
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(address);
    
    return parseFloat(formatUnits(balance, decimals));
  } catch (error: any) {
    throw new Error(`Failed to get USDC balance: ${error.message || error}`);
  }
};

/**
 * Get native token balance (ETH, MATIC, etc.) for gas
 */
export const getNativeBalance = async (address: string): Promise<number> => {
  const network = getNetwork();
  const rpcUrl = RPC_URLS[network];

  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for network: ${network}`);
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return parseFloat(formatUnits(balance, 18));
  } catch (error: any) {
    throw new Error(`Failed to get native balance: ${error.message || error}`);
  }
};

/**
 * Transfer USDC tokens
 */
export const transferUSDC = async (
  signer: any,
  userAddress: string,
  amount: number,
  type: TransactionType
): Promise<TransactionResult> => {
  const network = getNetwork();
  const contractAddress = USDC_CONTRACT_ADDRESSES[network];

  if (!contractAddress) {
    throw new Error(`USDC contract not configured for network: ${network}`);
  }

  try {
    const contract = new Contract(contractAddress, ERC20_ABI, signer);
    
    // Get decimals
    const decimals = await contract.decimals();
    const amountInTokenUnits = parseUnits(amount.toString(), decimals);

    let tx;
    if (type === TransactionType.DEPOSIT) {
      // Deposit: transfer USDC to escrow address
      const escrowAddress = getEscrowAddress();
      if (!escrowAddress || escrowAddress === '0x0000000000000000000000000000000000000000') {
        // For testing without a configured escrow, we can use a zero address as a placeholder
        // In production, you MUST configure a real escrow address
        throw new Error(
          'Escrow address not configured.\n\n' +
          'For testing deposits, please set VITE_ESCROW_ADDRESS in your .env file.\n' +
          'Example: VITE_ESCROW_ADDRESS=0xYourEscrowAddressHere\n\n' +
          'Note: In production, you would use a proper escrow smart contract.'
        );
      }
      
      // Check balance before transfer
      const balance = await contract.balanceOf(userAddress);
      if (balance < amountInTokenUnits) {
        throw new Error(`Insufficient USDC balance. Required: ${amount}, Available: ${formatUnits(balance, decimals)}`);
      }

      tx = await contract.transfer(escrowAddress, amountInTokenUnits, {
        gasLimit: 100000, // Reasonable gas limit for ERC20 transfer
      });
    } else {
      // Withdrawal: In a real escrow system, this would be handled by the escrow contract
      // The escrow contract would have the USDC and would transfer it back to the user
      // For this simplified implementation, we cannot perform withdrawals without an escrow contract
      
      const escrowAddress = getEscrowAddress();
      if (!escrowAddress || escrowAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(
          'Withdrawal requires escrow contract integration.\n\n' +
          'This app uses a simplified model where:\n' +
          '- Deposits: Transfer USDC to an escrow address\n' +
          '- Withdrawals: Require an escrow smart contract with a withdraw function\n\n' +
          'To enable withdrawals, you need to deploy an escrow contract that:\n' +
          '1. Holds deposited USDC\n' +
          '2. Has a withdraw() function that transfers USDC back to users\n' +
          '3. Implements proper access control and escrow logic\n\n' +
          'For now, withdrawals are simulated locally for UI purposes only.'
        );
      }

      // Check escrow balance
      const escrowBalance = await contract.balanceOf(escrowAddress);
      if (escrowBalance < amountInTokenUnits) {
        throw new Error(`Insufficient escrow balance. Required: ${amount}, Available: ${formatUnits(escrowBalance, decimals)}`);
      }

      // Note: This would require the escrow contract to call transfer, not the user
      // For a real implementation, you would call a function on the escrow contract
      throw new Error(
        'Withdrawals require calling the escrow contract\'s withdraw function.\n' +
        'This simplified implementation does not include escrow contract integration.\n' +
        'Please deploy an escrow contract to enable withdrawals.'
      );
    }

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }

    return {
      hash: receipt.hash,
      success: true,
    };
  } catch (error: any) {
    return {
      hash: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
};

/**
 * Listen for account changes
 */
export const onAccountChange = (callback: (accounts: string[]) => void) => {
  if (!isWalletAvailable()) {
    return () => {};
  }

  const ethereum = (window as any).ethereum;
  ethereum.on('accountsChanged', callback);

  return () => {
    ethereum.removeListener('accountsChanged', callback);
  };
};

/**
 * Listen for network changes
 */
export const onNetworkChange = (callback: (chainId: string) => void) => {
  if (!isWalletAvailable()) {
    return () => {};
  }

  const ethereum = (window as any).ethereum;
  ethereum.on('chainChanged', callback);

  return () => {
    ethereum.removeListener('chainChanged', callback);
  };
};

/**
 * Switch to the correct network (Sepolia testnet)
 */
export const switchToNetwork = async (): Promise<void> => {
  if (!isWalletAvailable()) {
    throw new Error('No wallet found');
  }

  const ethereum = (window as any).ethereum;
  const network = getNetwork();
  
  // Sepolia testnet chain ID is 11155111
  const chainIds: Record<string, string> = {
    sepolia: '0xaa36a7', // 11155111 in hex
    ethereum: '0x1',
    polygon: '0x89',
    amoy: '0x13882', // 80002 in hex
  };

  const targetChainId = chainIds[network];
  
  if (!targetChainId) {
    throw new Error(`Network ${network} not supported`);
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      // For Sepolia, we can try to add it
      if (network === 'sepolia') {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetChainId,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [RPC_URLS.sepolia],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Sepolia network to wallet');
        }
      } else {
        throw new Error(`Please add ${network} network to your wallet`);
      }
    } else {
      throw switchError;
    }
  }
};
