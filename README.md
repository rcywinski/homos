# HOMOS - Ethereum DeFi Interface

## Overview
HOMOS is a decentralized finance (DeFi) interface that integrates with Uniswap V3 on Ethereum networks. The application provides a user-friendly interface for interacting with Uniswap V3 pools, specifically focusing on the USDC/WETH pair.

## Features

### Uniswap V3 Pool Integration
- Real-time pool data display
- Automatic pool creation if it doesn't exist
- Price calculations and display for both tokens
- Liquidity monitoring
- Technical metrics (tick, sqrt price)

### Key Components

#### UniswapPool Component
The main component that handles Uniswap V3 pool interactions. It displays:
- Current token pair (USDC/WETH)
- Real-time price information
- Pool address
- Fee tier (0.3%)
- Current liquidity
- Technical indicators (current tick, sqrt price)
- Individual token prices

### Technical Details

#### Price Calculation
The application uses a specialized algorithm to calculate prices from Uniswap V3's square root price:
```typescript
const calculatePrice = (pool: Pool): number | null => {
  try {
    const sqrtPriceX96 = JSBI.toNumber(pool.sqrtRatioX96);
    const Q96 = Math.pow(2, 96);
    return (sqrtPriceX96 / Q96) * (sqrtPriceX96 / Q96);
  } catch (error) {
    console.error('Error calculating price:', error);
    return null;
  }
};
```

#### State Management
The application manages several states:
- Pool instance
- Pool address
- Current price
- Loading states
- Error handling
- Pool creation status

### Dependencies
- React
- wagmi (Ethereum interactions)
- viem (Ethereum data formatting)
- @uniswap/v3-sdk (Uniswap V3 integration)
- JSBI (Big integer handling)

### Network Support
Currently supports:
- Sepolia testnet

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MetaMask or another Web3 wallet
- Some testnet ETH on Sepolia

### Installation
1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

### Usage
1. Connect your Web3 wallet
2. The application will automatically:
   - Check for an existing USDC/WETH pool
   - Create a new pool if none exists
   - Display real-time pool information

### Error Handling
The application includes comprehensive error handling for:
- Wallet connection issues
- Pool initialization failures
- Price calculation errors
- Network issues

## Development

### Component Structure
```
src/
├── components/
│   └── UniswapPool.tsx    # Main pool interaction component
├── utils/
│   └── uniswap.ts        # Uniswap utilities and constants
└── styles/
    └── styles.css        # Component styling
```

### Future Enhancements
- Support for additional token pairs
- Liquidity provision interface
- Swap functionality
- Multiple network support
- Historical price data
- Advanced analytics

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
[Your License]

## Security
This is a testnet application. Do not use on mainnet without proper security audits. 