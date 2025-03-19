import { createPublicClient, http, createWalletClient } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';

async function main() {
  try {
    if (!privateKey) {
      throw new Error('Private key not found in environment variables');
    }

    const account = privateKeyToAccount(`0x${privateKey}`);
    
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl)
    });

    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(rpcUrl)
    });
    
    // Get account balance
    const balance = await publicClient.getBalance({ address: account.address });
    
    console.log('Wallet connected successfully!');
    console.log('Address:', account.address);
    console.log('Balance:', balance);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 