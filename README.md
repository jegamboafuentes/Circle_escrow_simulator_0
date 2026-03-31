# About this project

This project is a Lightning Bounties test to explore using USDC as an escrow rail for paying out and receiving bounty rewards.

## Run Locally

**Prerequisites:**  
- Node.js v18+
- MetaMask or another Web3 wallet browser extension
- Circle Console testnet API key (optional, for future Circle API integrations)
- Testnet USDC and ETH (for Sepolia testnet)

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env` file in the root directory with the following:
   ```env
   # Circle Console API Key (from Circle Console testnet)
   # Get your key from: https://app-sandbox.circle.com/
   VITE_CIRCLE_API_KEY=your_circle_api_key_here

   # Network to use (sepolia, ethereum, polygon, amoy)
   # Default: sepolia (Ethereum Sepolia testnet)
   VITE_NETWORK=sepolia

   # Escrow Address (required for deposits)
   # For testing, you can use any Ethereum address you control
   # In production, this should be your escrow smart contract address
   VITE_ESCROW_ADDRESS=0xYourEscrowAddressHere
   ```

3. **Get testnet tokens:**
   - **Sepolia ETH** (for gas): Get from [Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Alchemy Faucet](https://sepoliafaucet.com/)
   - **Sepolia USDC**: Get from [Circle Faucet](https://faucet.circle.com/)

4. **Run the app:**
   ```bash
   npm run dev
   ```

5. **Connect your wallet:**
   - Make sure MetaMask (or another Web3 wallet) is installed
   - Click "Connect Wallet" in the app
   - Approve the connection request
   - The app will automatically switch to Sepolia testnet if needed

### Features

- ✅ **Real wallet connection** using MetaMask/browser wallets
- ✅ **Real USDC deposits** to escrow address
- ⚠️ **Withdrawals** require escrow contract integration (currently simulated for UI)
- ✅ **Real-time balance updates**
- ✅ **Transaction history** with on-chain transaction hashes

### Important Notes

- **Deposits**: Transfer USDC from your wallet to the configured escrow address
- **Withdrawals**: Currently require an escrow smart contract. The UI simulates withdrawals for demonstration purposes, but real withdrawals need contract integration.
- **Network**: Defaults to Sepolia testnet. Make sure your wallet is connected to the correct network.
- **Escrow Address**: You must configure `VITE_ESCROW_ADDRESS` in your `.env` file for deposits to work.

### Development

The app uses:
- **React** + **TypeScript** for the UI
- **ethers.js v6** for Web3 wallet integration
- **Circle USDC** contracts on testnet
- **Vite** for development and building

# Enable Sepolia and USDC in Metamask

## 1- Enable Sepolia Network in MetaMask 

The Sepolia network is built into MetaMask by default but is often hidden. 

-   **Open MetaMask** and click the **Network Selector** (top left).
-   Toggle on **"Show test networks"**.
-   Select **Sepolia** from the list. 

## 2-Import USDC Token to MetaMask 

You must manually add the USDC contract address to see your balance. 

-   In MetaMask, make sure you are on the **Sepolia** network.
-   Scroll to the bottom and click **"Import tokens"**.
-   Select the **"Custom token"** tab.
-   Paste the official **Circle Sepolia USDC Contract Address**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`.
-   The symbol (USDC) and decimals (6) should auto-populate. Click **"Add custom token"**. 
