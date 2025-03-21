import React, { FC, useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { Pool, Position as UniswapPosition } from '@uniswap/v3-sdk';
import { formatUnits, Address } from 'viem';
import { tickToPrice } from '../../utils/liquidityManagement';
import JSBI from 'jsbi';

// Interface for position data
interface Position {
  id: string;
  liquidity: string;
  token0: string;
  token1: string;
  tickLower: number;
  tickUpper: number;
  amount0: string;
  amount1: string;
}

interface MyPositionsProps {
  pool: Pool;
  poolAddress: string;
  onSuccess: () => void;
}

const MyPositions: FC<MyPositionsProps> = ({ pool, poolAddress, onSuccess }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
  // State variables
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [removePercentage, setRemovePercentage] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load positions when component mounts or pool changes
  useEffect(() => {
    if (address && pool) {
      fetchPositions();
    }
  }, [address, pool, poolAddress]);

  // Fetch user positions for the current pool
  const fetchPositions = async () => {
    if (!address || !publicClient || !pool) return;
    
    setLoadingPositions(true);
    setError(null);
    
    try {
      // Address of the Uniswap V3 NonfungiblePositionManager
      const positionManagerAddress = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
      
      // Get the total number of positions owned by the user
      const balanceOf = await publicClient.readContract({
        address: positionManagerAddress as Address,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'balanceOf',
        args: [address]
      });
      
      const positionCount = Number(balanceOf);
      
      // If user has no positions, return early
      if (positionCount === 0) {
        setPositions([]);
        setLoadingPositions(false);
        return;
      }
      
      // Prepare to fetch position IDs
      const tokenOfOwnerByIndex = async (index: number) => {
        return publicClient.readContract({
          address: positionManagerAddress as Address,
          abi: [
            {
              name: 'tokenOfOwnerByIndex',
              type: 'function',
              stateMutability: 'view',
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'index', type: 'uint256' }
              ],
              outputs: [{ name: '', type: 'uint256' }]
            }
          ],
          functionName: 'tokenOfOwnerByIndex',
          args: [address, BigInt(index)]
        });
      };
      
      // Get all token IDs owned by the user
      const positionIdPromises = [];
      for (let i = 0; i < positionCount; i++) {
        positionIdPromises.push(tokenOfOwnerByIndex(i));
      }
      
      const positionIds = await Promise.all(positionIdPromises);
      
      // Prepare to fetch position details
      const getPositionDetails = async (tokenId: bigint) => {
        return publicClient.readContract({
          address: positionManagerAddress as Address,
          abi: [
            {
              name: 'positions',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'tokenId', type: 'uint256' }],
              outputs: [
                { name: 'nonce', type: 'uint96' },
                { name: 'operator', type: 'address' },
                { name: 'token0', type: 'address' },
                { name: 'token1', type: 'address' },
                { name: 'fee', type: 'uint24' },
                { name: 'tickLower', type: 'int24' },
                { name: 'tickUpper', type: 'int24' },
                { name: 'liquidity', type: 'uint128' },
                { name: 'feeGrowthInside0LastX128', type: 'uint256' },
                { name: 'feeGrowthInside1LastX128', type: 'uint256' },
                { name: 'tokensOwed0', type: 'uint128' },
                { name: 'tokensOwed1', type: 'uint128' }
              ]
            }
          ],
          functionName: 'positions',
          args: [tokenId]
        });
      };
      
      // Fetch details for all positions
      const positionDetailsPromises = [];
      for (const id of positionIds) {
        positionDetailsPromises.push(getPositionDetails(BigInt(id.toString())));
      }
      
      const positionDetailsResults = await Promise.all(positionDetailsPromises);
      
      // Filter positions that belong to the current pool and format them
      const userPositions = positionDetailsResults
        .map((details, index) => {
          const [
            nonce,
            operator,
            token0Address,
            token1Address,
            fee,
            tickLower,
            tickUpper,
            liquidity,
            feeGrowthInside0LastX128,
            feeGrowthInside1LastX128,
            tokensOwed0,
            tokensOwed1
          ] = details as unknown as [
            bigint, string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
          ];
          
          // Check if this position is for the current pool
          const poolMatchesPosition = 
            pool.token0.address.toLowerCase() === token0Address.toLowerCase() &&
            pool.token1.address.toLowerCase() === token1Address.toLowerCase() &&
            pool.fee === Number(fee);
          
          if (!poolMatchesPosition) return null;
          
          // Only include positions that have liquidity
          if (liquidity <= BigInt(0)) return null;
          
          const tokenId = positionIds[index].toString();
          
          // For display purposes, we'll use the actual Uniswap V3 price curve mathematics
          let amount0 = '0';
          let amount1 = '0';
          
          try {
            // @ts-ignore - We're prioritizing accurate calculations over type safety
            // Create a Position instance with the actual liquidity amount
            const positionInstance = new UniswapPosition({
              pool,
              tickLower: Number(tickLower),
              tickUpper: Number(tickUpper),
              liquidity: JSBI.BigInt(liquidity.toString())
            });
            
            // Get the token amounts from the position
            // @ts-ignore - Ignore type errors to get the actual values
            const token0Amount = positionInstance.amount0;
            // @ts-ignore - Ignore type errors to get the actual values
            const token1Amount = positionInstance.amount1;
            
            // Format the amounts for display
            // @ts-ignore - We know these are JSBI objects that will convert to strings
            amount0 = formatUnits(BigInt(token0Amount.toString()), pool.token0.decimals);
            // @ts-ignore - We know these are JSBI objects that will convert to strings
            amount1 = formatUnits(BigInt(token1Amount.toString()), pool.token1.decimals);
          } catch (err) {
            console.error('Error calculating precise token amounts:', err);
            
            // Fallback to simplified calculation if the precise one fails
            const currentTick = pool.tickCurrent;
            const tickLowerNum = Number(tickLower);
            const tickUpperNum = Number(tickUpper);
            
            // Calculate approximate amounts based on current tick
            if (currentTick < tickLowerNum) {
              // Position is entirely in token0
              amount0 = formatUnits(liquidity / BigInt(10), pool.token0.decimals);
            } else if (currentTick > tickUpperNum) {
              // Position is entirely in token1
              amount1 = formatUnits(liquidity / BigInt(10), pool.token1.decimals);
            } else {
              // Position is partially in both tokens
              amount0 = formatUnits(liquidity / BigInt(20), pool.token0.decimals);
              amount1 = formatUnits(liquidity / BigInt(20), pool.token1.decimals);
            }
          }
          
          return {
            id: tokenId,
            liquidity: liquidity.toString(),
            token0: pool.token0.symbol || 'Token0',
            token1: pool.token1.symbol || 'Token1',
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            amount0,
            amount1
          };
        })
        .filter(Boolean) as Position[];
      
      setPositions(userPositions);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to load positions: ' + (err instanceof Error ? err.message : String(err)));
      
      // Fallback to mock data for demo purposes if fetching fails
      if (process.env.NODE_ENV !== 'production') {
        const mockPositions: Position[] = [
          {
            id: '1234',
            liquidity: '1000000000000000000',
            token0: pool.token0.symbol || 'Unknown',
            token1: pool.token1.symbol || 'Unknown',
            tickLower: pool.tickCurrent - 1000,
            tickUpper: pool.tickCurrent + 1000,
            amount0: '0.5',
            amount1: '1000'
          },
          {
            id: '5678',
            liquidity: '500000000000000000',
            token0: pool.token0.symbol || 'Unknown',
            token1: pool.token1.symbol || 'Unknown',
            tickLower: pool.tickCurrent - 500,
            tickUpper: pool.tickCurrent + 500,
            amount0: '0.25',
            amount1: '500'
          }
        ];
        
        setPositions(mockPositions);
        setError('Using mock data: ' + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      setLoadingPositions(false);
    }
  };

  // Handle removing liquidity from a specific position
  const handleRemoveLiquidityFromPosition = async (position: Position) => {
    if (!walletClient || !address || !publicClient) {
      setError('Wallet not connected');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Calculate liquidity to remove based on percentage (default 100%)
      const liquidityToRemove = BigInt(position.liquidity) * BigInt(removePercentage) / BigInt(100);
      
      // Import the needed function when using
      const { prepareRemoveLiquidityTransaction } = await import('../../utils/liquidityManagement');
      
      // Prepare transaction using the utility function from liquidityManagement.ts
      // @ts-ignore - We're prioritizing functionality over type safety
      const txData = prepareRemoveLiquidityTransaction(
        position.id,
        liquidityToRemove.toString(),
        0.5, // Default slippage tolerance of 0.5%
        1800, // 30 minutes deadline
        chainId
      );
      
      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: txData.to,
        data: txData.data,
        account: address,
        value: BigInt(txData.value || '0')
      });
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        setSuccess(`Successfully removed liquidity from position ${position.id}`);
        // Refresh positions list
        fetchPositions();
        // Notify parent of success
        onSuccess();
      } else {
        setError('Transaction failed');
      }
    } catch (err) {
      console.error('Error removing liquidity:', err);
      setError('Failed to remove liquidity: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Format price range for display
  const formatPriceRange = (tickLower: number, tickUpper: number) => {
    if (!pool) return 'Unknown range';
    
    const lowerPrice = tickToPrice(
      tickLower, 
      pool.token0.decimals, 
      pool.token1.decimals
    );
    
    const upperPrice = tickToPrice(
      tickUpper, 
      pool.token0.decimals, 
      pool.token1.decimals
    );
    
    return `${lowerPrice.toFixed(6)} - ${upperPrice.toFixed(6)} ${pool.token1.symbol} per ${pool.token0.symbol}`;
  };

  return (
    <div className="positions-list">
      {loading && <div className="loading">Processing transaction...</div>}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {loadingPositions ? (
        <div className="loading">Loading positions...</div>
      ) : positions.length === 0 ? (
        <div className="no-positions">
          No positions found for this pool
        </div>
      ) : (
        <>
          <div className="positions-count">
            Found {positions.length} position{positions.length !== 1 ? 's' : ''}
          </div>
          
          {positions.map((position) => (
            <div key={position.id} className="position-item">
              <div className="position-header">
                <span className="position-id">Position #{position.id}</span>
                <span className="position-liquidity">Liquidity: {position.liquidity}</span>
              </div>
              
              <div className="position-details">
                <div className="position-range">
                  <span className="label">Price Range:</span>
                  <span className="value">{formatPriceRange(position.tickLower, position.tickUpper)}</span>
                </div>
                
                <div className="position-ticks">
                  <span className="label">Ticks:</span>
                  <span className="value">{position.tickLower} - {position.tickUpper}</span>
                </div>
                
                <div className="position-amounts">
                  <div>
                    <span className="label">{position.token0}:</span>
                    <span className="value">{position.amount0}</span>
                  </div>
                  <div>
                    <span className="label">{position.token1}:</span>
                    <span className="value">{position.amount1}</span>
                  </div>
                </div>
                
                <div className="position-actions">
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveLiquidityFromPosition(position)}
                  >
                    Remove Liquidity
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default MyPositions; 