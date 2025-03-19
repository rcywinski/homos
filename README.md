# Ethereum Wallet Interface

A modern, user-friendly Ethereum wallet interface built with React, TypeScript, and wagmi. This application provides a seamless experience for interacting with Ethereum networks, managing transactions, and accessing test networks.

## Features

### 1. Wallet Connection
- Supports multiple wallet providers (Rabby Wallet, MetaMask, etc.)
- Displays wallet address and connection status
- Shows real-time ETH balance

### 2. Network Management
- Support for multiple networks:
  - **Mainnet**: Main Ethereum network for real transactions
  - **Sepolia**: Test network for development
- Easy network switching with clear visual indicators
- Network status display with current block number
- Warning messages for unsupported networks

### 3. Transaction History
- Tracks and displays the last 10 transactions
- Real-time transaction status updates:
  - 🟡 Pending
  - 🟢 Confirmed
  - 🔴 Failed
- Persistent storage across sessions
- Links to Etherscan for detailed transaction information
- Displays transaction timestamps and network information

### 4. Sepolia Testnet Features
- Integrated faucet access for obtaining test ETH
- Multiple faucet options:
  - Alchemy Faucet (0.5 Sepolia ETH daily)
  - Infura Faucet (0.5 Sepolia ETH daily)
  - QuickNode Faucet (0.1 Sepolia ETH daily)
- Clear instructions for obtaining test ETH

## Technical Stack

- **Frontend Framework**: React with TypeScript
- **Ethereum Interaction**: wagmi
- **Styling**: CSS with modern design patterns
- **State Management**: React Hooks
- **Network Support**: Mainnet and Sepolia

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A web3 wallet (Rabby Wallet, MetaMask, etc.)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [repository-name]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

## Usage Guide

### 1. Connecting Your Wallet

1. Open the application in your browser
2. Click the "Connect Wallet" button
3. Select your preferred wallet provider
4. Approve the connection request in your wallet

### 2. Switching Networks

1. Navigate to the "Network Control" section
2. Click either "Switch to Mainnet" or "Switch to Sepolia"
3. Approve the network switch in your wallet

### 3. Getting Test ETH (Sepolia)

1. Switch to Sepolia network
2. Find the "Get Free Sepolia ETH" section
3. Choose a faucet from the available options
4. Follow the faucet website instructions to receive test ETH

### 4. Viewing Transaction History

- Transactions are automatically tracked and displayed in the Transaction History section
- Each transaction shows:
  - Transaction hash (clickable link to Etherscan)
  - Current status
  - Timestamp
  - Network

## Local Storage

The application uses local storage to persist:
- Transaction history (last 10 transactions per address)
- Transaction statuses and updates

## Security Features

- Secure wallet connection handling
- Network validation
- Safe transaction tracking
- No storage of sensitive information

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [wagmi](https://wagmi.sh/) - React Hooks for Ethereum
- [Viem](https://viem.sh/) - TypeScript Interface for Ethereum
- Ethereum Foundation for the Sepolia testnet

## Future Enhancements

Planned features and improvements:
1. Uniswap V3 pool interactions
2. Enhanced transaction details (gas used, value transferred)
3. Transaction filtering by status/network
4. Additional network support
5. Advanced wallet features (ENS support, token management) 