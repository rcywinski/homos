/**
 * Read-only data for the "Live" page: the paper state and the pool state from /live/api (same origin, forwarded by
 * the chat server to the bot's public API). No token, no address setting, no browser storage, no action: this is
 * the whole difference from the cockpit's useBotApi.
 */
import { useEffect, useState } from 'react';
import type {
  BotStateShape,
  CandidateVerdict,
  PaperData,
  PaperStatus,
  RankingData,
  RankingStatus,
  WideBacktestsData,
  WideDailyData,
} from '../../src/hooks/useBotApi';

export const PAPER_HOURS = 168;
const POLL_MS = 60_000;
/** The rankings change once a day (selector after 06:00, nightly steps after 05:00): a slow poll is enough. */
const RANKING_POLL_MS = 30 * 60_000;

export interface LiveRankings {
  ranking: RankingData | null;
  rankingStatus: RankingStatus;
  wideRanking: RankingData | null;
  wideRankingStatus: RankingStatus;
  wideDaily: WideDailyData | null;
  wideBacktests: WideBacktestsData | null;
  candidates: CandidateVerdict[] | null;
}

const EMPTY_RANKINGS: LiveRankings = {
  ranking: null,
  rankingStatus: 'loading',
  wideRanking: null,
  wideRankingStatus: 'loading',
  wideDaily: null,
  wideBacktests: null,
  candidates: null,
};

async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  try {
    const r = await fetch(url);
    return { status: r.status, body: r.ok ? ((await r.json()) as T) : null };
  } catch {
    return { status: 0, body: null };
  }
}

const rankingStatus = (status: number): RankingStatus => (status === 200 ? 'ok' : status === 503 ? 'not-started' : 'error');

/** Both rankings and their extra columns, read-only, polled every 30 minutes. */
export function useLiveRankings(): LiveRankings {
  const [r, setR] = useState<LiveRankings>(EMPTY_RANKINGS);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [daily, wide, wideDaily, wideBacktests, candidates] = await Promise.all([
        getJson<RankingData>('/live/api/ranking'),
        getJson<RankingData>('/live/api/wide-ranking'),
        getJson<WideDailyData>('/live/api/wide-daily'),
        getJson<WideBacktestsData>('/live/api/wide-backtests'),
        getJson<CandidateVerdict[]>('/live/api/candidates'),
      ]);
      if (!alive) return;
      setR({
        ranking: daily.body,
        rankingStatus: rankingStatus(daily.status),
        wideRanking: wide.body,
        wideRankingStatus: rankingStatus(wide.status),
        wideDaily: wideDaily.body,
        wideBacktests: wideBacktests.body,
        candidates: candidates.body,
      });
    };
    void load();
    const id = setInterval(() => void load(), RANKING_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return r;
}

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
