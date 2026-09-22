import React, { FC } from 'react';
import { BotStatus } from '../hooks/useBotApi';

const LABEL: Record<BotStatus, string> = {
  online: 'Bot: data fresh',
  stale: 'Bot: data stale (>5 min)',
  offline: 'Bot: offline',
  loading: 'Bot: connecting…',
};

/** Small colored dot: green (fresh) / yellow (stale) / grey (offline) — TASKS-UI.md Batch 2 #3. */
const BotStatusDot: FC<{ status: BotStatus }> = ({ status }) => (
  <span className={`bot-dot bot-dot-${status}`} title={LABEL[status]} />
);

export default BotStatusDot;
