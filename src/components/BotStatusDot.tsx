import React, { FC } from 'react';
import { BotStatus } from '../hooks/useBotApi';

const LABEL: Record<BotStatus, string> = {
  online: 'Bot: dane świeże',
  stale: 'Bot: dane nieaktualne (>5 min)',
  offline: 'Bot: offline',
  loading: 'Bot: łączenie…',
};

/** Small colored dot: green (fresh) / yellow (stale) / grey (offline) — TASKS-UI.md Partia 2 #3. */
const BotStatusDot: FC<{ status: BotStatus }> = ({ status }) => (
  <span className={`bot-dot bot-dot-${status}`} title={LABEL[status]} />
);

export default BotStatusDot;
