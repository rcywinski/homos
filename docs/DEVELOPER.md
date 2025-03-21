# Developer Documentation for HOMOS

This document provides technical information for developers working on the HOMOS Liquidity Manager project.

## Project Structure

The Liquidity Manager is composed of several key components:

- `LiquidityManager.tsx`: The main container component that manages tab navigation
- `AddLiquidity.tsx`: Handles the creation of new liquidity positions
- `MyPositions.tsx`: Displays and manages existing positions
- Components directory:
  - `PriceInputs.tsx`: Dual-range price input component
  - `TokenInputs.tsx`: Token amount input fields with validation
  - `GasEstimateDisplay.tsx`: Shows transaction cost estimates

## Development Setup

### Starting the Application

The application uses webpack-dev-server for development. To start the application:

```bash
npm run start
```

This command runs the webpack-dev-server as defined in the package.json scripts:

```json
"scripts": {
  "start": "webpack-dev-server --config webpack.config.js",
  ...
}
```

### Building for Production

To create a production build:

```bash
npm run build
```

## Component Design

### AddLiquidity Component

The `AddLiquidity` component handles the main liquidity provision flow:

```jsx
<AddLiquidity
  pool={pool}
  onSuccess={() => refreshPositions()}
/>
```

#### Key Features:

1. **Price Range Selection**:
   - Full, narrow (±5%) and custom (±30%) range options
   - Dynamically calculates valid tick ranges based on pool's tickSpacing
   - UI display adapts to mobile with responsive design

2. **Token Amount Calculation**:
   - Uses the current pool price to calculate corresponding token amounts
   - Handles special cases for ETH/WETH and stablecoin pairs
   - Provides appropriate formatting for different token types

3. **Token Approval Flow**:
   - Checks if token approval is needed before transaction
   - Handles one-time approval process with ERC20 approve()
   - Shows approval status and buttons when needed

4. **Transaction Processing**:
   - Creates positions using Uniswap V3 SDK
   - Handles slippage tolerance settings
   - Provides detailed error messages for common issues

### Style System

We use a modular CSS approach with dedicated files:

- `liquidityManager.css`: Main styles for all liquidity components
- CSS classes follow a consistent naming pattern:
  - Container elements: `*-container`, `*-wrapper`
  - Interactive elements: `*-option`, `*-button`, `*-input`
  - Status indicators: `*.selected`, `*.disabled`, `*.error`

### Formatter Utilities

The `formatters.ts` utility provides consistent number formatting:

- `formatTokenAmount()`: Dynamic decimal precision based on token value size
- `formatPrice()`: Price-specific formatting for token pair prices
- `formatBalance()`: Formats wallet balances with appropriate precision
- `formatPercentage()`: Formats percentages with the right precision

## Price Range Implementation

The price range options use a custom radio-button style UI:

```jsx
<div className="range-options-wrapper">
  <div 
    className={`range-option ${priceRange === 'full' ? 'selected' : ''}`}
    onClick={() => handlePriceRangeChange('full')}
  >
    <div className="range-option-radio"></div>
    <div className="range-option-label">Full Range (Min/Max)</div>
  </div>
  {/* Similar elements for other options */}
</div>
```

Each option triggers the appropriate price range calculation while providing visual feedback.

## Responsive Design

The component uses media queries to adapt to different screen sizes:

- Desktop (>768px): Horizontal layout with side-by-side inputs
- Tablet (480-768px): Adjusted spacing with some stacked elements
- Mobile (<480px): Fully stacked interface with optimized touch targets

## Error Handling

The component provides detailed error messages for common issues:

- Insufficient token balances
- Price range validation errors
- Transaction failures with specific guidance
- Position creation errors with recommendations

## Gas Estimation

Gas costs are estimated and displayed to users before transactions:

- Uses the Ethereum provider's `estimateGas` function
- Falls back to typical gas values when estimation fails
- Updates in real-time as user inputs change

## Best Practices

When modifying the Liquidity Manager, follow these guidelines:

1. Maintain consistent error handling and user feedback
2. Keep the UI responsive across all device sizes
3. Use the formatter utilities for consistent number display
4. Test with a variety of token pairs and price ranges
5. Follow the established CSS naming conventions 