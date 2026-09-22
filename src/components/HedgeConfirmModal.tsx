/**
 * HedgeConfirmModal.tsx — confirmation for [Approve hedge]/[Close short]
 * (TASKS-UI.md Batch 9). ONE signature in Rabby (GMX ExchangeRouter multicall,
 * value=executionFee) + an optional separate USDC approve (only on open —
 * `plan.approval` is `null` on close). The same component handles both
 * directions (`plan.preview.direction`), differing only in title/text.
 * Execution in useHedgeExecution.ts.
 */
import React, { FC } from 'react';
import { HedgePlan } from '../utils/hedgeBuilder';
import { useHedgeExecution } from '../hooks/useHedgeExecution';

interface Props {
  plan: HedgePlan;
  execution: ReturnType<typeof useHedgeExecution>;
  onClose: () => void;
  onDone: () => void;
}

const HedgeConfirmModal: FC<Props> = ({ plan, execution, onClose, onDone }) => {
  const running = execution.status.phase === 'checking' || execution.status.phase === 'approving' || execution.status.phase === 'sending';
  const isOpen = plan.preview.direction === 'open-short';

  return (
    <div className="modal-overlay" onClick={running ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isOpen ? 'Approve hedge (SHORT)' : 'Close short (hedge)'}</h3>
          {!running && (
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <div className="modal-body">
          <div className="morning-note morning-proposal-note">{plan.summary}</div>

          <div className="sequence-steps">
            <div className="sequence-step">
              <div className="sequence-step-label">Size</div>
              <div className="sequence-step-detail muted">
                {plan.preview.sizeEth.toFixed(4)} ETH (~${plan.preview.sizeUsd.toFixed(0)})
              </div>
            </div>
            <div className="sequence-step">
              <div className="sequence-step-label">Collateral</div>
              <div className="sequence-step-detail muted">
                ${plan.preview.collateralUsdc.toFixed(0)} USDC · leverage {plan.preview.leverage.toFixed(2)}×
              </div>
            </div>
            <div className="sequence-step">
              <div className="sequence-step-label">{isOpen ? 'Acceptable price (min. entry)' : 'Acceptable price (max. buyback)'}</div>
              <div className="sequence-step-detail muted">${plan.preview.acceptablePriceUsd.toFixed(2)} (slippage limit)</div>
            </div>
            <div className="sequence-step">
              <div className="sequence-step-label">Execution fee</div>
              <div className="sequence-step-detail muted">{plan.preview.executionFeeEth.toFixed(5)} ETH for the keeper (overpayment is refunded)</div>
            </div>
          </div>

          <div className="morning-note">
            The order is executed by the GMX keeper at the oracle price in the next block (max slippage = acceptable price above). Check the position status on{' '}
            <a href="https://app.gmx.io/#/trade/?market=ETH-USD" target="_blank" rel="noreferrer">
              app.gmx.io ↗
            </a>
            .
          </div>
          {isOpen && <div className="morning-note">Do the first test with a small amount — the GMX v2 integration is new in this app.</div>}

          {execution.status.message && execution.status.phase !== 'idle' && <div className="morning-note">{execution.status.message}</div>}
          {execution.error && <div className="message error">{execution.error}</div>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={running}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={running || execution.status.phase === 'done'}
              onClick={() => execution.execute(plan, onDone)}
            >
              {execution.status.phase === 'done' ? 'Sent ✓' : running ? 'In progress…' : isOpen ? 'Send order →' : 'Send close →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HedgeConfirmModal;
