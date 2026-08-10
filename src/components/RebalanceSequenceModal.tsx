/**
 * RebalanceSequenceModal.tsx — [Zatwierdź] na kartach propozycji REBALANCE
 * (TASKS-UI.md Partia 4b). Pokazuje listę kroków z `RebalancePlan`
 * (rebalanceBuilder.ts) z podglądem (label + detail), pasek postępu podczas
 * wykonania (useRebalanceExecution.ts) i stan "dokończ krok N/M" po
 * odświeżeniu strony (progress w localStorage, czytany tu tylko do wyświetlenia
 * — sama logika resume jest w hooku).
 */
import React, { FC, useMemo } from 'react';
import { Pool } from '@uniswap/v3-sdk';
import { RebalancePlan, loadProgress } from '../utils/rebalanceBuilder';
import { useRebalanceExecution } from '../hooks/useRebalanceExecution';

interface Props {
  plan: RebalancePlan;
  pool: Pool;
  newTickLower: number;
  newTickUpper: number;
  execution: ReturnType<typeof useRebalanceExecution>;
  onClose: () => void;
  onDone: () => void;
}

const RebalanceSequenceModal: FC<Props> = ({ plan, pool, newTickLower, newTickUpper, execution, onClose, onDone }) => {
  // Tylko do wyświetlenia "dokończ krok N/M" — execute() sam sprawdza to
  // ponownie wewnątrz przed wysłaniem każdego kroku.
  const progress = useMemo(() => loadProgress(plan.chainId, plan.tokenId), [plan.chainId, plan.tokenId]);
  const running = execution.status.phase === 'approving' || execution.status.phase === 'step';
  const doneCount = progress?.completed.length ?? 0;

  return (
    <div className="modal-overlay" onClick={running ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Zatwierdź rebalans #{plan.tokenId}</h3>
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

          {plan.swapSkipped && <div className="morning-note">Proporcje już bliskie docelowym — krok swap pominięty.</div>}
          <div className="morning-note">Approvals (jeśli potrzebne) wysyłane automatycznie tuż przed odpowiednim krokiem — nic do zrobienia ręcznie.</div>

          {execution.status.message && execution.status.phase !== 'idle' && (
            <div className="morning-note">
              {execution.status.phase === 'approving' && `Approvals: `}
              {execution.status.phase === 'step' && `Krok ${execution.status.stepIndex}/${execution.status.totalSteps}: `}
              {execution.status.message}
            </div>
          )}
          {execution.error && <div className="message error">{execution.error}</div>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={running}>
              Anuluj
            </button>
            <button
              className="primary-button"
              disabled={running || execution.status.phase === 'done'}
              onClick={() => execution.execute(pool, plan, newTickLower, newTickUpper, 50, onDone)}
            >
              {execution.status.phase === 'done'
                ? 'Zakończono ✓'
                : running
                ? 'W trakcie…'
                : doneCount > 0
                ? `Dokończ (krok ${doneCount + 1}/${plan.steps.length})`
                : 'Wykonaj sekwencję'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RebalanceSequenceModal;
