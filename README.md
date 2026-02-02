# USDC Bounty Platform (Lightning Bounties–style)

A Lightning Bounties–style platform with **USDC** instead of Bitcoin. Paste a GitHub issue URL, fund a bounty in USDC, and when a developer’s pull request that closes the issue is merged, they receive the payout in USDC.

## Flow

1. **Post a bounty**: Paste a GitHub issue URL and set the USDC amount. Create the bounty, then send USDC to the platform fund address and mark it as funded.
2. **Solve a bounty**: Connect your GitHub account, open a PR that fixes the issue, and include **`close #&lt;issue_number&gt;`** (or `closes #&lt;issue_number&gt;`) in the PR description so GitHub links the PR to the issue.
3. **Get paid**: When the PR is merged, the backend detects it and pays out USDC to your linked wallet. Connect GitHub before claiming so the platform can match your PR to your account.

## Run Locally

**Prerequisites:**  
- Node.js v18+
- MetaMask or another Web3 wallet
- Testnet USDC and ETH (Sepolia)
- (Backend) GitHub OAuth app for “Connect GitHub”

### Frontend

1. **Install and configure:**
   ```bash
   npm install
   ```
   Create a `.env` in the project root:
   ```env
   VITE_NETWORK=sepolia
   VITE_ESCROW_ADDRESS=0xYourEscrowAddressHere
   VITE_API_URL=http://localhost:3001
   ```

2. **Run:**
   ```bash
   npm run dev
   ```

### Backend

1. **Install and configure:**
   ```bash
   cd server && npm install
   ```
   Copy `server/.env.example` to `server/.env` and set:
   - **GITHUB_CLIENT_ID** / **GITHUB_CLIENT_SECRET**: from [GitHub OAuth Apps](https://github.com/settings/developers). Callback URL: `http://localhost:3001/api/auth/github/callback`
   - **FRONTEND_URL**: `http://localhost:5173`
   - **BACKEND_URL**: `http://localhost:3001`
   - **PAYOUT_WALLET_PRIVATE_KEY** (optional): private key of the wallet that holds USDC and sends payouts. Set **PAYOUT_WALLET_ADDRESS** instead if you only want to show the fund address.
   - **GITHUB_TOKEN** (optional): for higher GitHub API rate limits when checking merged PRs.

2. **Run:**
   ```bash
   npm start
   ```

3. **Payout flow** (why money didn’t flow after you merged a PR):
   - The developer must **connect GitHub** to the platform **before** the PR is merged so the system can match their GitHub username to their wallet.
   - Two jobs must run: (1) **Check merged PRs** – marks bounties as claimed when the issue was closed by a merged PR; (2) **Run payouts** – sends USDC from the payout wallet to the winner.
   - You can trigger them from the UI (buttons at the bottom of the Bounty list) or from the terminal:
     - `cd server && npm run job:check-prs` then `npm run job:payouts`
   - Or call the API: `POST /api/jobs/check-prs` then `POST /api/jobs/run-payouts`.
   - The payout wallet (PAYOUT_WALLET_PRIVATE_KEY) must hold enough USDC; posters fund bounties by sending USDC to that address when they mark a bounty as funded.

### Features

- Wallet connect (MetaMask) and **Connect GitHub** for developers
- **Post bounty**: GitHub issue URL + USDC amount; fund by sending USDC to the platform fund address, then click “I’ve sent”
- **Reserved balance** (Lightning Bounties–style): “Reserved (bounties)” shows the sum you’ve committed to open/claimed bounties; “Available” = escrow − reserved. Cancel an open funded bounty to release that amount (no on-chain refund in this version).
- **Bounty feed**: list open/claimed/paid/cancelled bounties; “My bounties” filter; “Cancel bounty” for your open funded bounties; payout status and tx link
- **Payout flow**: run “Check merged PRs” then “Run payouts” (from UI or cron) so the PR author’s linked wallet receives USDC

### Developer payout requirement

Include **`close #&lt;issue_number&gt;`** (or `closes #&lt;issue_number&gt;`) in your pull request description so GitHub links the PR to the issue. Connect your GitHub account to the platform before your PR is merged so the system can match your username to your wallet for the payout.

### Development

- **Frontend**: React, TypeScript, Vite, ethers v6
- **Backend**: Node, Express, SQLite (better-sqlite3), GitHub OAuth and REST API
