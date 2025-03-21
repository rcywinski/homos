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
npm run start
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

# HOMOS - ETH/ERC20 Liquidity Manager

A modern, user-friendly interface for managing Uniswap V3 liquidity positions.

## Features

- **Add Liquidity**: Create new positions with customizable price ranges
- **Remove Liquidity**: Withdraw from existing positions
- **Position Management**: View and manage all your active positions
- **Real-time Gas Estimates**: See estimated transaction costs before confirming
- **Token Balance Display**: View your available token balances

## Liquidity Manager

The Liquidity Manager component allows users to add liquidity to Uniswap V3 pools with a simple, intuitive interface.

### Price Range Options

The price range selector provides three options:

- **Full Range (Min/Max)**: Provides liquidity across the entire price range. Earns fees at any price, but with less capital efficiency.
- **Narrow Range (±5%)**: Concentrated liquidity within 5% of the current price. Higher capital efficiency but requires monitoring.
- **Custom Range (±30%)**: Set a custom price range that balances risk and capital efficiency.

All options are presented in a single row for easy selection, with the current option highlighted.

### Token Inputs

The token input fields display:
- Clear labels for each token
- Token symbols shown within the input field
- Helpful guidance for minimum amounts
- Your current wallet balances for reference

### Transaction Process

1. Select your desired price range
2. Enter token amounts (the app will auto-calculate the paired token amount)
3. Review the slippage tolerance setting
4. Approve tokens if needed (one-time process per token)
5. Click "Add Liquidity" to create your position

### Mobile Responsive

The interface adapts to different screen sizes, with optimized layouts for:
- Desktop: Full horizontal layout with side-by-side inputs
- Tablet: Adjusted spacing and element sizes
- Mobile: Stacked inputs and controls for easier interaction on small screens

## Technical Notes

- Built with React and TypeScript
- Uses wagmi for Ethereum wallet integration
- Implements the Uniswap V3 SDK for liquidity position calculations
- CSS styling optimized for all modern browsers 