import { createWallet } from '../config/wallet';

async function main() {
  try {
    const { account, publicClient } = createWallet();
    
    // Get account balance
    const balance = await publicClient.getBalance({ address: account.address });
    
    console.log('Wallet connected successfully!');
    console.log('Address:', account.address);
    console.log('Balance:', balance);
    
    // Here you can add your custom wallet operations
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 