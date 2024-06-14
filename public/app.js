import { ethers } from 'ethers';

document.addEventListener('DOMContentLoaded', () => {
  let signer = null;

  document.getElementById('connectButton').addEventListener('click', async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        const provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        const address = await signer.getAddress();
        document.getElementById('address').innerText = 'Address: ' + address;

        const blockNumber = await provider.getBlockNumber();
        document.getElementById('blockNumber').innerText = 'Block Number: ' + blockNumber;

        const balance = await provider.getBalance(address);
        document.getElementById('balance').innerText = 'Balance: ' + ethers.formatEther(balance) + ' ETH';

        console.log('Address', address);

        // now signer can make some transactions

      } catch (error) {
        console.error('User rejected the request or other error:', error);
      }
    } else {
      console.log('MetaMask not installed');
    }
  });
});
