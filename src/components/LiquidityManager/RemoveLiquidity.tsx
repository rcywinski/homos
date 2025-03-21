import React, { FC, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { Pool } from '@uniswap/v3-sdk';
import { Address } from 'viem';

interface RemoveLiquidityProps {
  pool: Pool;
  onSuccess: () => void;
}

const RemoveLiquidity: FC<RemoveLiquidityProps> = ({ pool, onSuccess }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
  // State variables
  const [positionId, setPositionId] = useState<string>('');
  const [removePercentage, setRemovePercentage] = useState<number>(100);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle removing liquidity
  const handleRemoveLiquidity = async () => {
    if (!walletClient || !address || !publicClient) {
      setError('Wallet not connected');
      return;
    }
    
    if (!positionId || isNaN(parseInt(positionId))) {
      setError('Please enter a valid position ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Import the needed function when using
      const { prepareRemoveLiquidityTransaction } = await import('../../utils/liquidityManagement');
      
      // Fetch position details to get liquidity amount
      const positionManagerAddress = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
      
      try {
        // Get position liquidity from contract
        const positionData = await publicClient.readContract({
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
          args: [BigInt(positionId)]
        });
        
        const [,,,,,,, liquidity] = positionData as unknown as [
          bigint, string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
        ];
        
        if (liquidity <= BigInt(0)) {
          setError('Position has no liquidity');
          setLoading(false);
          return;
        }
        
        // Calculate liquidity to remove based on percentage
        const liquidityToRemove = BigInt(liquidity.toString()) * BigInt(removePercentage) / BigInt(100);
        
        // Prepare transaction
        // @ts-ignore - We're prioritizing functionality over type safety
        const txData = prepareRemoveLiquidityTransaction(
          positionId,
          liquidityToRemove.toString(),
          slippageTolerance,
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
          setSuccess('Liquidity removed successfully!');
          // Reset form
          setPositionId('');
          setRemovePercentage(100);
          // Notify parent of success
          onSuccess();
        } else {
          setError('Transaction failed');
        }
      } catch (fetchErr) {
        console.error('Error fetching position:', fetchErr);
        setError('Position not found or not accessible');
      }
    } catch (err) {
      console.error('Error removing liquidity:', err);
      setError('Failed to remove liquidity: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="remove-liquidity-form">
      {loading && <div className="loading">Processing transaction...</div>}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="form-group">
        <label>Position ID</label>
        <input
          type="text"
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          placeholder="Enter the NFT token ID of your position"
        />
        <div className="input-info">
          You can find your position IDs in the "My Positions" tab
        </div>
      </div>
      
      <div className="form-group">
        <label>Remove Percentage: {removePercentage}%</label>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={removePercentage}
          onChange={(e) => setRemovePercentage(parseInt(e.target.value))}
        />
      </div>
      
      <div className="form-group slippage-group">
        <label>Slippage Tolerance: {slippageTolerance}%</label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={slippageTolerance}
          onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
        />
      </div>
      
      <button 
        onClick={handleRemoveLiquidity}
        className="remove-liquidity-btn"
      >
        Remove Liquidity
      </button>
    </div>
  );
};

export default RemoveLiquidity; 