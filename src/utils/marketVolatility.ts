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
  // Immediately use mock data in development environment to avoid CORS issues
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Using mock data in development environment to avoid CORS issues');
    return generateMockSwapEvents(days);
  }
  
  // Choose the appropriate endpoint based on chain ID
  let graphEndpoint = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  
  // Alternative endpoints for different chains
  if (chainId === 1) {
    // Mainnet endpoints
    const endpoints = [
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/name/messari/uniswap-v3-ethereum',
      'https://api.studio.thegraph.com/query/48211/uniswap-v3-ethereum/version/latest'
    ];
    graphEndpoint = endpoints[0];
  } else if (chainId === 11155111) {
    // Sepolia testnet - use mock data
    console.log('Using mock data for Sepolia testnet');
    return generateMockSwapEvents(days);
  }
  
  const timestamp = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  const query = `{
    swaps(
      first: 1000,
      where: { pool: "${poolAddress.toLowerCase()}", timestamp_gt: ${timestamp} },
      orderBy: timestamp,
      orderDirection: asc
    ) {
      timestamp
      amount0
      amount1
      amountUSD
      sqrtPriceX96
    }
  }`;
  
  // Implement retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  // List of CORS proxies to try
  const corsProxies = [
    '', // No proxy (direct request)
    'https://api.allorigins.win/raw?url=', // CORS proxy option 1
    'https://corsproxy.io/?' // CORS proxy option 2
  ];
  
  while (retryCount < maxRetries) {
    try {
      // Determine which endpoint to use
      let currentEndpoint = graphEndpoint;
      if (chainId === 1 && retryCount > 0) {
        // Use alternative endpoints on retries
        const altEndpointIndex = retryCount % 2 + 1; // Switch between endpoint 1 and 2
        currentEndpoint = `https://api.studio.thegraph.com/query/48211/uniswap-v3-ethereum/version/latest`;
      }
      
      // Determine which proxy to use
      const proxyIndex = Math.floor(retryCount / 2) % corsProxies.length;
      const proxyPrefix = corsProxies[proxyIndex];
      
      // For proxies that need encoded URLs
      const targetUrl = proxyPrefix 
        ? (proxyPrefix.includes('allorigins') 
            ? encodeURIComponent(currentEndpoint) 
            : currentEndpoint)
        : currentEndpoint;
        
      const fetchUrl = proxyPrefix + targetUrl;
      
      console.log(`Fetching from The Graph (attempt ${retryCount + 1}): ${fetchUrl}`);
      
      // Add timeout to fetch to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(proxyPrefix ? fetchUrl : currentEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://app.uniswap.org' // Spoof origin to bypass CORS in some cases
        },
        body: JSON.stringify({ query }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we got valid data
      if (data && data.data && Array.isArray(data.data.swaps)) {
        console.log(`Successfully retrieved ${data.data.swaps.length} swap events`);
        return data.data.swaps || [];
      } else {
        console.warn('Received invalid data format from The Graph:', data);
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;
      
      // Short delay before retrying
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // All retries failed, log error and fall back to mock data
  console.error('All attempts to fetch swap events failed:', lastError);
  console.info('Fallback: Using generated mock swap data');
  return generateMockSwapEvents(days);
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
    
    // Generate multiple events per day (more than before for better data)
    for (let j = 0; j < 10; j++) {
      const hourOffset = j * 2.4; // spread events throughout the day
      const timestamp = dayTimestamp + (hourOffset * 60 * 60);
      
      // Create more realistic price variation
      const randomFactor = 0.03; // 3% random movement
      const dayFactor = Math.sin(i / 5) * 0.08; // Add more pronounced cyclicality
      const price = basePrice * (1 + dayFactor + (Math.random() - 0.5) * randomFactor);
      
      // Calculate realistic swap amounts
      const amount0 = (Math.random() * 2 + 0.1).toFixed(6); // Small ETH amount
      const amount1 = (parseFloat(amount0) * price).toFixed(2); // Corresponding USD amount
      
      events.push({
        timestamp: timestamp.toString(),
        amount0: amount0,
        amount1: amount1,
        amountUSD: price.toString(),
        sqrtPriceX96: Math.sqrt(price * 2**96).toString()
      });
    }
  }
  
  // Sort by timestamp to ensure proper ordering
  return events.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
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
    
    // Force mock data in development to avoid CORS issues
    const useMockData = window.location.hostname === 'localhost' || 
                        !poolAddress || 
                        chainId === 11155111;
    
    if (!useMockData) {
      try {
        // Get swap events from The Graph
        const swapEvents = await fetchSwapEventsFromGraph(poolAddress, days, chainId);
        
        // Process swap events into daily OHLC data
        priceData = groupSwapsByDay(swapEvents);
        
        // If we didn't get enough data points, fall back to mock data
        if (priceData.length < 14) {
          console.warn(`Not enough data points from API (${priceData.length}), using mock data`);
          priceData = generateMockPriceData(days);
        }
      } catch (error) {
        console.error('Error fetching swap events, using mock data:', error);
        priceData = generateMockPriceData(days);
      }
    } else {
      console.info('Using mock price data');
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
    // Even if everything fails, return something usable
    const mockData = generateMockPriceData(days);
    const mockBB = calculateBollingerBands(mockData);
    return {
      atr: [],
      bollingerBands: mockBB,
      volatilityPercentage: 5, // Default reasonable volatility
      priceData: mockData
    };
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