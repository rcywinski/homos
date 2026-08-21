import { formatUnits, formatEther } from 'viem';

/**
 * Format token amounts for display based on their size
 * Uses more decimal places for small values, fewer for large values
 */
export function formatTokenAmount(amount: string | number, decimals: number = 18): string {
  if (!amount) return '0';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format based on size
  if (numAmount < 0.0000001) return numAmount.toExponential(4);
  if (numAmount < 0.000001) return numAmount.toExponential(4);
  if (numAmount < 0.00001) return numAmount.toFixed(9);
  if (numAmount < 0.0001) return numAmount.toFixed(8);
  if (numAmount < 0.001) return numAmount.toFixed(7);
  if (numAmount < 0.01) return numAmount.toFixed(6);
  if (numAmount < 0.1) return numAmount.toFixed(5);
  if (numAmount < 1) return numAmount.toFixed(4);
  if (numAmount < 10) return numAmount.toFixed(3);
  if (numAmount < 1000) return numAmount.toFixed(2);
  if (numAmount < 10000) return numAmount.toFixed(1);
  return Math.round(numAmount).toString();
}

/**
 * Format a token balance from wagmi useBalance hook
 */
export function formatBalance(balance: any, token: any, defaultDecimals: number = 18): string {
  if (!balance) return '...';
  
  const isEth = token?.symbol?.includes('ETH');
  const value = isEth 
    ? formatEther(balance.value)
    : formatUnits(balance.value, token?.decimals || defaultDecimals);
    
  return formatTokenAmount(value);
}

/**
 * Format a price with appropriate precision
 */
export function formatPrice(price: number): string {
  if (price === 0) return '0';
  
  if (price < 0.0000001) return price.toExponential(4);
  if (price < 0.000001) return price.toFixed(9);
  if (price < 0.00001) return price.toFixed(8);
  if (price < 0.0001) return price.toFixed(7);
  if (price < 0.001) return price.toFixed(6);
  if (price < 0.01) return price.toFixed(5);
  if (price < 0.1) return price.toFixed(4);
  if (price < 1) return price.toFixed(4);
  if (price < 10) return price.toFixed(3);
  if (price < 100) return price.toFixed(2);
  if (price < 1000) return price.toFixed(1);
  return Math.round(price).toString();
}

/**
 * Format a percentage with appropriate precision
 */
export function formatPercentage(percentage: number): string {
  if (percentage === 0) return '0%';
  
  // For very small percentages, use exponential notation
  if (Math.abs(percentage) < 0.001) return percentage.toExponential(2) + '%';
  
  // For small percentages, show more decimal places
  if (Math.abs(percentage) < 0.01) return percentage.toFixed(4) + '%';
  if (Math.abs(percentage) < 0.1) return percentage.toFixed(3) + '%';
  if (Math.abs(percentage) < 1) return percentage.toFixed(2) + '%';
  
  // For regular percentages, use fewer decimal places
  if (Math.abs(percentage) < 100) return percentage.toFixed(2) + '%';
  
  // For large percentages, no decimal places
  return Math.round(percentage) + '%';
} 
/**
 * Czas trwania w formie zwięzłej: "48min", "6h 12min", "3d 4h".
 * Bez sekund — bot próbkuje co 15 minut, więc większa precyzja byłaby fikcją.
 * Dodane 21.08 pod licznik "ile pozycja jest poza zakresem" (paper + realne).
 */
export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
