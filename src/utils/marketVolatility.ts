import { ATR, BollingerBands } from 'technicalindicators';
import { NETWORKS } from './uniswap';

interface PriceData {
  high: number;
  low: number;
  close: number;
  timestamp?: number;
}

interface SwapEvent {
  timestamp: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  sqrtPriceX96: string;
}

/**
 * Calculate Average True Range (ATR) for a series of price data
 * ATR measures market volatility by decomposing the range of price movements
 * @param priceData Array of price data with high, low, and close values
 * @param period The time period to calculate ATR for (typically 14 days)
 * @returns Array of ATR values
 */
export const calculateATR = (priceData: PriceData[], period: number = 14): number[] => {
  if (priceData.length < period) {
    console.warn(`Not enough data points for ATR calculation. Need at least ${period}, got ${priceData.length}`);
    return [];
  }

  const input = {
    high: priceData.map(d => d.high),
    low: priceData.map(d => d.low),
    close: priceData.map(d => d.close),
    period
  };

  return ATR.calculate(input);
};

/**
 * Calculate Bollinger Bands for a series of price data
 * Bollinger Bands consist of a middle band (simple moving average) and two outer bands
 * that are standard deviations away from the middle band
 * @param priceData Array of price data with close values
 * @param period The time period for the SMA (typically 20)
 * @param stdDev Number of standard deviations for the bands (typically 2)
 * @returns Object with arrays for upper, middle, and lower bands
 */
export const calculateBollingerBands = (
  priceData: PriceData[], 
  period: number = 20, 
  stdDev: number = 2
): { upper: number[], middle: number[], lower: number[] } => {
  if (priceData.length < period) {
    console.warn(`Not enough data points for Bollinger Bands calculation. Need at least ${period}, got ${priceData.length}`);
    return { upper: [], middle: [], lower: [] };
  }

  const input = {
    values: priceData.map(d => d.close),
    period,
    stdDev
  };

  const result = BollingerBands.calculate(input);
  
  // Convert result array to the expected format
  const upper: number[] = result.map(r => r.upper);
  const middle: number[] = result.map(r => r.middle);
  const lower: number[] = result.map(r => r.lower);
  
  return { upper, middle, lower };
};

/**
 * Calculate the current market volatility as a percentage
 * using the relationship between the Bollinger Bands width
 * @param bollingerBands The Bollinger Bands data
 * @returns Volatility as a percentage
 */
export const calculateVolatilityPercentage = (
  bollingerBands: { upper: number[], middle: number[], lower: number[] }
): number => {
  if (bollingerBands.upper.length === 0) return 0;
  
  // Use the most recent values
  const idx = bollingerBands.upper.length - 1;
  const upper = bollingerBands.upper[idx];
  const lower = bollingerBands.lower[idx];
  const middle = bollingerBands.middle[idx];
  
  // Calculate the width of the bands relative to the middle price
  return ((upper - lower) / middle) * 100;
};

/**
 * Group swap events by day to create OHLC data
 * @param swapEvents Array of swap events
 * @returns Array of price data with daily OHLC values
 */
const groupSwapsByDay = (swapEvents: SwapEvent[]): PriceData[] => {
  if (!swapEvents.length) return [];
  
  // Sort events by timestamp
  const sortedEvents = [...swapEvents].sort((a, b) => 
    parseInt(a.timestamp) - parseInt(b.timestamp)
  );
  
  const dailyData: Record<string, {
    prices: number[],
    timestamp: number
  }> = {};
  
  // Group events by day
  sortedEvents.forEach(event => {
    const date = new Date(parseInt(event.timestamp) * 1000);
    const day = date.toISOString().split('T')[0];
    
    // Calculate price from amountUSD
    const price = parseFloat(event.amountUSD);
    
    if (!dailyData[day]) {
      dailyData[day] = {
        prices: [],
        timestamp: parseInt(event.timestamp) * 1000
      };
    }
    
    dailyData[day].prices.push(price);
  });
  
  // Calculate OHLC for each day
  return Object.values(dailyData).map(day => {
    const prices = day.prices;
    return {
      close: prices[prices.length - 1],
      high: Math.max(...prices),
      low: Math.min(...prices),
      timestamp: day.timestamp
    };
  });
};

/**
 * Query The Graph for historical swap events
 * @param poolAddress Uniswap pool address
 * @param days Number of days to fetch data for
 * @param chainId Chain ID to determine which subgraph to use
 */
const fetchSwapEventsFromGraph = async (
  poolAddress: string, 
  days: number = 30,
  chainId: number = 1
): Promise<SwapEvent[]> => {
  // Determine which endpoint to use based on chainId
  let graphEndpoint: string;
  if (chainId === 1) { // Mainnet
    graphEndpoint = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  } else { // Sepolia or others
    // For Sepolia, use a fallback since it doesn't have the same level of indexing
    return generateMockSwapEvents(days);
  }
  
  // Calculate timestamp for X days ago
  const nowSeconds = Math.floor(Date.now() / 1000);
  const daysAgoSeconds = nowSeconds - (days * 24 * 60 * 60);
  
  const query = `{
    swaps(
      where: { 
        pool: "${poolAddress.toLowerCase()}", 
        timestamp_gt: ${daysAgoSeconds}
      }
      orderBy: timestamp
      first: 1000
    ) {
      timestamp
      amount0
      amount1
      amountUSD
      sqrtPriceX96
    }
  }`;
  
  try {
    const response = await fetch(graphEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.swaps || [];
  } catch (error) {
    console.error('Error fetching swap events from The Graph:', error);
    // Fall back to mock data if there's an error
    return generateMockSwapEvents(days);
  }
};

/**
 * Generate mock swap events for testing or when The Graph is unavailable
 */
const generateMockSwapEvents = (days: number): SwapEvent[] => {
  const events: SwapEvent[] = [];
  const now = Math.floor(Date.now() / 1000);
  const basePrice = 1900; // Base price for ETH
  
  for (let i = days; i >= 0; i--) {
    const dayTimestamp = now - (i * 24 * 60 * 60);
    
    // Generate multiple events per day
    for (let j = 0; j < 5; j++) {
      const hourOffset = j * 4; // spread events throughout the day
      const timestamp = dayTimestamp + (hourOffset * 60 * 60);
      
      // Create some price variation
      const randomFactor = 0.02; // 2% random movement
      const dayFactor = Math.sin(i / 5) * 0.05; // Add cyclicality
      const price = basePrice * (1 + dayFactor + (Math.random() - 0.5) * randomFactor);
      
      events.push({
        timestamp: timestamp.toString(),
        amount0: (Math.random() * 10).toString(),
        amount1: (Math.random() * 10 * price).toString(),
        amountUSD: price.toString(),
        sqrtPriceX96: Math.sqrt(price * 2**96).toString()
      });
    }
  }
  
  return events;
};

/**
 * Fetch historical price data and calculate volatility metrics
 * @param token0Symbol First token symbol (e.g., 'WETH')
 * @param token1Symbol Second token symbol (e.g., 'USDC')
 * @param poolAddress The address of the Uniswap pool
 * @param days Number of days of historical data to fetch
 * @param chainId Chain ID to determine which subgraph to use
 */
export const fetchHistoricalDataAndCalculateVolatility = async (
  token0Symbol: string,
  token1Symbol: string,
  poolAddress: string = '',
  days: number = 30,
  chainId: number = 1
): Promise<{
  atr: number[],
  bollingerBands: { upper: number[], middle: number[], lower: number[] },
  volatilityPercentage: number,
  priceData: PriceData[]
}> => {
  try {
    let priceData: PriceData[];
    
    if (poolAddress) {
      // Get swap events from The Graph
      const swapEvents = await fetchSwapEventsFromGraph(poolAddress, days, chainId);
      
      // Process swap events into daily OHLC data
      priceData = groupSwapsByDay(swapEvents);
    } else {
      // If no pool address, fall back to mock data
      priceData = generateMockPriceData(days);
    }
    
    // Calculate volatility metrics
    const atr = calculateATR(priceData);
    const bollingerBands = calculateBollingerBands(priceData);
    const volatilityPercentage = calculateVolatilityPercentage(bollingerBands);
    
    return {
      atr,
      bollingerBands,
      volatilityPercentage,
      priceData
    };
  } catch (error) {
    console.error('Error calculating volatility metrics:', error);
    throw error;
  }
};

/**
 * Generate mock price data for testing
 * @param days Number of days to generate data for
 */
const generateMockPriceData = (days: number): PriceData[] => {
  const basePrice = 1900; // Base price for ETH
  const data: PriceData[] = [];
  
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Create some random price movements
    const randomFactor = 0.02; // 2% random movement
    const dayFactor = Math.sin(i / 5) * 0.05; // Add some cyclicality
    
    const closePrice = basePrice * (1 + dayFactor + (Math.random() - 0.5) * randomFactor);
    const highPrice = closePrice * (1 + Math.random() * 0.01);
    const lowPrice = closePrice * (1 - Math.random() * 0.01);
    
    data.push({
      close: closePrice,
      high: highPrice,
      low: lowPrice,
      timestamp: date.getTime()
    });
  }
  
  return data;
}; 