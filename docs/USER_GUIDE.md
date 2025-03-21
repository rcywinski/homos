# Liquidity Manager User Guide

This guide will help you use the HOMOS Liquidity Manager to provide liquidity to Uniswap V3 pools and earn fees.

## Getting Started

1. Connect your wallet using the "Connect Wallet" button in the top-right corner
2. Select the token pair you want to provide liquidity for
3. Navigate to the "Add Liquidity" tab

### Running the Application

If you're running the application locally:

1. Make sure you have installed the dependencies with `npm install`
2. Start the application with:
   ```bash
   npm run start
   ```
3. Open your browser to the local development URL (typically http://localhost:8080)

## Adding Liquidity

### Step 1: Choose a Price Range

You have three options for setting your price range:

![Price Range Selection](/images/docs/price-range-options.png)

- **Full Range (Min/Max)**: Provides liquidity across all possible prices. This option:
  - Earns fees regardless of price movement
  - Uses capital less efficiently
  - Is good for very stable pairs or when you're unsure about price direction

- **Narrow Range (±5%)**: Concentrates liquidity within 5% of the current price. This option:
  - Maximizes fee earnings when price stays within range
  - Stops earning fees if price moves outside the range
  - Requires higher minimum token amounts (50+ USDC, 0.025+ ETH)

- **Custom Range (±30%)**: Set a custom price range based on your market expectations. This option:
  - Balances between capital efficiency and price movement risk
  - Gives you full control over the minimum and maximum prices
  - Shows percentages from current price for reference

### Step 2: Enter Token Amounts

![Token Inputs](/images/docs/token-inputs.png)

1. Enter the amount of either token you wish to provide
2. The paired token amount will automatically calculate based on the current price
3. Your wallet balances are displayed for reference
4. Follow the guidance for minimum amounts based on your selected price range

### Step 3: Review and Approve

![Add Liquidity](/images/docs/add-liquidity.png)

1. Set your slippage tolerance (default is 0.5%)
2. If this is your first time providing liquidity, approve token usage
3. Review the gas estimate for your transaction
4. Click "Add Liquidity" to create your position

## Understanding Price Inputs

For custom ranges, you can directly adjust the price inputs:

![Price Inputs](/images/docs/price-inputs.png)

- **Min Price**: The lower bound of your price range
- **Max Price**: The upper bound of your price range
- **Current Price**: The current market price (orange marker)
- **Percentage**: Shows how far your range extends from the current price

## Best Practices

- **For narrow ranges**: Use larger token amounts (50+ USDC, 0.025+ ETH)
- **For stable pairs**: Consider using a narrow range to maximize efficiency
- **For volatile pairs**: Use wider ranges to avoid being out of range
- **Monitor your positions**: Check if the current price is within your range

## Troubleshooting

### Common Errors

- **"Insufficient balance"**: You don't have enough tokens in your wallet
- **"Position creation failed"**: Try using larger amounts for narrow ranges
- **"Price range too narrow"**: Widen your price range for a valid position

### Tips

- When using ETH/WETH, the system will check both your wrapped and native balances
- For very small token values, the system will show appropriate decimal places
- Mobile users can view all options in a stacked layout for easier navigation 