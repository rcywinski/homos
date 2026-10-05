/**
 * wallet.ts — read-only sanity check of the watched wallet.
 *
 * Prints the native balance of BOT_WATCH_ADDRESS on every chain the bot knows,
 * using the same RPC fallback lists as the observer. No private key is involved:
 * the whole stack is propose-only and signing happens in the browser wallet.
 *
 * Usage: npm run wallet
 */
import 'dotenv/config';
import { createPublicClient, formatEther, http } from 'viem';
import { mainnet, base, arbitrum } from 'viem/chains';
import { RPC, WATCH_ADDRESS } from '../bot/config';

const CHAINS = { mainnet, base, arbitrum } as const;

async function main() {
  console.log(`Address: ${WATCH_ADDRESS}`);
  for (const [name, chain] of Object.entries(CHAINS)) {
    const client = createPublicClient({ chain, transport: http(RPC[name]?.[0]) });
    try {
      const balance = await client.getBalance({ address: WATCH_ADDRESS });
      console.log(`  ${name.padEnd(8)} ${formatEther(balance)} ${chain.nativeCurrency.symbol}`);
    } catch (err) {
      console.error(`  ${name.padEnd(8)} error: ${(err as Error).message.split('\n')[0]}`);
    }
  }
}

main();
