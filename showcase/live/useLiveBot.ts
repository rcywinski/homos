/**
 * Read-only data for the "Live" page: the paper state and the pool state from /live/api (same origin, forwarded by
 * the chat server to the bot's public API). No token, no address setting, no browser storage, no action: this is
 * the whole difference from the cockpit's useBotApi.
 */
import { useEffect, useState } from 'react';
import type { PaperData, PaperStatus, BotStateShape } from '../../src/hooks/useBotApi';

export const PAPER_HOURS = 168;
const POLL_MS = 60_000;

export interface LiveBot {
  paper: PaperData | null;
  paperStatus: PaperStatus;
  state: BotStateShape | null;
  updatedAt: number | null;
}

export function useLiveBot(): LiveBot {
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperStatus>('loading');
  const [state, setState] = useState<BotStateShape | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/live/api/paper?hours=${PAPER_HOURS}`);
        if (!alive) return;
        if (r.status === 503) setPaperStatus('not-started');
        else if (!r.ok) setPaperStatus('error');
        else {
          setPaper((await r.json()) as PaperData);
          setPaperStatus('ok');
          setUpdatedAt(Date.now());
        }
      } catch {
        if (alive) setPaperStatus('error');
      }
      try {
        const s = await fetch('/live/api/state');
        if (alive && s.ok) setState((await s.json()) as BotStateShape);
      } catch {
        // the pool state is optional on this page; the paper panel stands on its own
      }
    };
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { paper, paperStatus, state, updatedAt };
}
