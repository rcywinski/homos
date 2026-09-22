/**
 * RotateSequenceModal.tsx — [Approve] on ROTATE proposal cards
 * (TASKS-UI.md Batch 8, cross-pool on the same chain). Twin of
 * RebalanceSequenceModal.tsx — difference: `RotatePlan` operates on TWO pools
 * (old/new), so execute() from useRotateExecution.ts takes `newPool`
 * instead of a single `pool`, and the preview shows `preview.bridgeSwap`/
 * `preview.balanceSwap` instead of `swapSkipped`.
 */
import React, { FC, useMemo } from 'react';
import { Pool } from '@uniswap/v3-sdk';
import { RotatePlan } from '../utils/rebalanceBuilder';
import { useRotateExecution, loadRotateProgress } from '../hooks/useRotateExecution';

interface Props {
  plan: RotatePlan;
  newPool: Pool;
  newTickLower: number;
  newTickUpper: number;
  execution: ReturnType<typeof useRotateExecution>;
  onClose: () => void;
  onDone: () => void;
}

const RotateSequenceModal: FC<Props> = ({ plan, newPool, newTickLower, newTickUpper, execution, onClose, onDone }) => {
  // Only for displaying "finish step N/M" — execute() re-checks this
  // internally before sending each step.
  const progress = useMemo(() => loadRotateProgress(plan.chainId, plan.tokenId), [plan.chainId, plan.tokenId]);
  const running = execution.status.phase === 'approving' || execution.status.phase === 'step';
  const doneCount = progress?.completed.length ?? 0;

  return (
    <div className="modal-overlay" onClick={running ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Approve rotation #{plan.tokenId}</h3>
          {!running && (
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <div className="modal-body">
          <div className="sequence-steps">
            {plan.steps.map((s) => {
              const isDone = execution.status.phase === 'done' || (progress?.completed.includes(s.index) ?? false);
              const isActive = running && execution.status.stepIndex === s.index;
              return (
                <div key={s.index} className={`sequence-step ${isDone ? 'sequence-step-done' : ''} ${isActive ? 'sequence-step-active' : ''}`}>
                  <div className="sequence-step-label">
                    {isDone ? '✓' : isActive ? '⏳' : '○'} {s.label}
                  </div>
                  <div className="sequence-step-detail muted">{s.detail}</div>
                </div>
              );
            })}
          </div>

          {!plan.preview.bridgeSwap && !plan.preview.balanceSwap && (
            <div className="morning-note">Same pair (tier change) and proportions already close to target — no extra swaps.</div>
          )}
          {plan.preview.bridgeSwap && <div className="morning-note">Bridge step: {plan.preview.bridgeSwap}.</div>}
          {plan.preview.balanceSwap && <div className="morning-note">Proportion balancing: {plan.preview.balanceSwap}.</div>}
          <div className="morning-note">Approvals (if needed) are sent automatically right before the relevant step — nothing to do manually.</div>

          {execution.status.message && execution.status.phase !== 'idle' && (
            <div className="morning-note">
              {execution.status.phase === 'approving' && `Approvals: `}
              {execution.status.phase === 'step' && `Step ${execution.status.stepIndex}/${execution.status.totalSteps}: `}
              {execution.status.message}
            </div>
          )}
          {execution.error && <div className="message error">{execution.error}</div>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={running}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={running || execution.status.phase === 'done'}
              onClick={() => execution.execute(newPool, plan, newTickLower, newTickUpper, 50, onDone)}
            >
              {execution.status.phase === 'done'
                ? 'Done ✓'
                : running
                ? 'In progress…'
                : doneCount > 0
                ? `Finish (step ${doneCount + 1}/${plan.steps.length})`
                : 'Run sequence'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotateSequenceModal;
