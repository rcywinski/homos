/**
 * RotateSequenceModal.tsx — [Zatwierdź] na kartach propozycji ROTATE
 * (TASKS-UI.md Partia 8, cross-pool w tej samej sieci). Bliźniak
 * RebalanceSequenceModal.tsx — różnica: `RotatePlan` operuje na DWÓCH pulach
 * (stara/nowa), więc execute() z useRotateExecution.ts przyjmuje `newPool`
 * zamiast pojedynczego `pool`, i podgląd pokazuje `preview.bridgeSwap`/
 * `preview.balanceSwap` zamiast `swapSkipped`.
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
  // Tylko do wyświetlenia "dokończ krok N/M" — execute() sam sprawdza to
  // ponownie wewnątrz przed wysłaniem każdego kroku.
  const progress = useMemo(() => loadRotateProgress(plan.chainId, plan.tokenId), [plan.chainId, plan.tokenId]);
  const running = execution.status.phase === 'approving' || execution.status.phase === 'step';
  const doneCount = progress?.completed.length ?? 0;

  return (
    <div className="modal-overlay" onClick={running ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Zatwierdź rotację #{plan.tokenId}</h3>
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
            <div className="morning-note">Ta sama para (zmiana tieru) i proporcje już bliskie docelowym — bez dodatkowych swapów.</div>
          )}
          {plan.preview.bridgeSwap && <div className="morning-note">Krok pomostowy: {plan.preview.bridgeSwap}.</div>}
          {plan.preview.balanceSwap && <div className="morning-note">Wyrównanie proporcji: {plan.preview.balanceSwap}.</div>}
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
              onClick={() => execution.execute(newPool, plan, newTickLower, newTickUpper, 50, onDone)}
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

export default RotateSequenceModal;
