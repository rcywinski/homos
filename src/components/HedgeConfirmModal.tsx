/**
 * HedgeConfirmModal.tsx — potwierdzenie [Zatwierdź hedge]/[Zamknij short]
 * (TASKS-UI.md Partia 9). JEDEN podpis w Rabby (multicall ExchangeRoutera GMX,
 * value=executionFee) + ewentualny approve USDC osobno (tylko przy otwarciu —
 * `plan.approval` jest `null` przy zamknięciu). Ten sam komponent obsługuje
 * oba kierunki (`plan.preview.direction`), różnią się tylko tytułem/tekstem.
 * Wykonanie w useHedgeExecution.ts.
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
          <h3>{isOpen ? 'Zatwierdź hedge (SHORT)' : 'Zamknij short (hedge)'}</h3>
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
              <div className="sequence-step-label">Rozmiar</div>
              <div className="sequence-step-detail muted">
                {plan.preview.sizeEth.toFixed(4)} ETH (~${plan.preview.sizeUsd.toFixed(0)})
              </div>
            </div>
            <div className="sequence-step">
              <div className="sequence-step-label">Collateral</div>
              <div className="sequence-step-detail muted">
                ${plan.preview.collateralUsdc.toFixed(0)} USDC · dźwignia {plan.preview.leverage.toFixed(2)}×
              </div>
            </div>
            <div className="sequence-step">
              <div className="sequence-step-label">{isOpen ? 'Cena akceptowalna (min. wejście)' : 'Cena akceptowalna (maks. odkup)'}</div>
              <div className="sequence-step-detail muted">${plan.preview.acceptablePriceUsd.toFixed(2)} (limit poślizgu)</div>
            </div>
            <div className="sequence-step">
              <div className="sequence-step-label">Execution fee</div>
              <div className="sequence-step-detail muted">{plan.preview.executionFeeEth.toFixed(5)} ETH dla keepera (nadpłata wraca)</div>
            </div>
          </div>

          <div className="morning-note">
            Zlecenie wykona keeper GMX po cenie oracle w kolejnym bloku (max poślizg = cena akceptowalna powyżej). Status pozycji sprawdź na{' '}
            <a href="https://app.gmx.io/#/trade/?market=ETH-USD" target="_blank" rel="noreferrer">
              app.gmx.io ↗
            </a>
            .
          </div>
          {isOpen && <div className="morning-note">Pierwszy test rób na małej kwocie — integracja GMX v2 jest nowa w tej appce.</div>}

          {execution.status.message && execution.status.phase !== 'idle' && <div className="morning-note">{execution.status.message}</div>}
          {execution.error && <div className="message error">{execution.error}</div>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} disabled={running}>
              Anuluj
            </button>
            <button
              className="primary-button"
              disabled={running || execution.status.phase === 'done'}
              onClick={() => execution.execute(plan, onDone)}
            >
              {execution.status.phase === 'done' ? 'Wysłano ✓' : running ? 'W trakcie…' : isOpen ? 'Wyślij zlecenie →' : 'Wyślij zamknięcie →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HedgeConfirmModal;
