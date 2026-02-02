/**
 * Job: for each bounty with status=claimed and funded_at set, send USDC from
 * PAYOUT_WALLET to winner_wallet, then set status=paid_out and record in payouts.
 * Run after checkMergedPRs. Requires PAYOUT_WALLET_PRIVATE_KEY.
 */
import 'dotenv/config';
import { getDb } from '../db.js';
import { Wallet, JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers';

const USDC_ADDRESSES = {
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};
const RPC_URLS = {
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-rpc.com',
};
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export async function runPayouts() {
  const key = process.env.PAYOUT_WALLET_PRIVATE_KEY;
  if (!key) return { paid: 0, message: 'PAYOUT_WALLET_PRIVATE_KEY not set' };
  const network = process.env.NETWORK || 'sepolia';
  const rpcUrl = RPC_URLS[network];
  const usdcAddress = USDC_ADDRESSES[network];
  if (!rpcUrl || !usdcAddress) throw new Error('NETWORK not supported');

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(key, provider);
  const usdc = new Contract(usdcAddress, ERC20_ABI, wallet);
  const decimals = await usdc.decimals();

  const db = getDb();
  const bounties = db
    .prepare("SELECT * FROM bounties WHERE status = 'claimed' AND funded_at IS NOT NULL AND winner_wallet IS NOT NULL")
    .all();

  let paid = 0;
  for (const b of bounties) {
    const to = b.winner_wallet;
    const amountUsdc = b.amount_usdc;
    const amountWei = parseUnits(String(amountUsdc), decimals);
    try {
      const balance = await usdc.balanceOf(wallet.address);
      if (balance < amountWei) {
        console.error(`Bounty ${b.id}: insufficient USDC balance`);
        continue;
      }
      const tx = await usdc.transfer(to, amountWei);
      const receipt = await tx.wait();
      db.prepare(
        "UPDATE bounties SET status = 'paid_out', paid_at = datetime('now'), payout_tx_hash = ? WHERE id = ?"
      ).run(receipt.hash, b.id);
      db.prepare(
        'INSERT INTO payouts (bounty_id, to_address, amount_usdc, tx_hash) VALUES (?, ?, ?, ?)'
      ).run(b.id, to, amountUsdc, receipt.hash);
      paid++;
      console.log(`Bounty ${b.id}: paid ${amountUsdc} USDC to ${to}, tx ${receipt.hash}`);
    } catch (err) {
      console.error(`Bounty ${b.id} payout failed:`, err.message);
    }
  }
  return { paid };
}

if (process.argv[1]?.includes('runPayouts')) {
  runPayouts().then((r) => console.log('Done:', r)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
