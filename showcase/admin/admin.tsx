/**
 * The admin page (phase 4, step 4.10c): the owner turns the local models on or off, and sees their state. Reached
 * only through Cloudflare Access and the server's JWT check; the session is Access's own cookie, this page sets none.
 * One action, POST /api/admin/switch with JSON; the state refreshes every 3 seconds.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface AdminState {
  switch: { effective: boolean; master: 'on' | 'off'; page: 'on' | 'off' | 'unset' };
  models: { state: string; stages?: { name: string; status: string }[] };
  release: { pending: boolean; reason?: string; problem?: string; nextCheckInSec?: number };
  idleReleaseInMinutes: number | null;
  queue: { running: boolean; waiting: number };
  today: { day: string; outcomes: Record<string, number> };
}

async function getState(): Promise<AdminState | null> {
  try {
    const r = await fetch('/api/admin/state', { cache: 'no-store' });
    return r.ok ? ((await r.json()) as AdminState) : null;
  } catch {
    return null;
  }
}

function Admin() {
  const [s, setS] = useState<AdminState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const tick = () => void getState().then((v) => live && setS(v));
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const set = async (on: boolean) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/admin/switch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ on }) });
      const body = (await r.json().catch(() => ({}))) as { message?: string };
      if (!r.ok) setNote(body.message ?? `The server answered ${r.status}.`);
    } catch {
      setNote('The server cannot be reached.');
    }
    setS(await getState());
    setBusy(false);
  };

  if (!s) return <main className="admin"><h1>Model switch</h1><p data-testid="admin-loading">Loading the state…</p></main>;
  const on = s.switch.effective;
  const outcomes = Object.entries(s.today.outcomes).sort(([a], [b]) => a.localeCompare(b));
  return (
    <main className="admin" data-testid="admin">
      <h1>Model switch</h1>
      <div className="admin-switch">
        <span className={`state state-${on ? 'on' : 'off'}`} data-testid="admin-effective">
          Models {on ? 'allowed' : 'off'}
        </span>
        <button type="button" className="primary" disabled={busy || on || s.switch.master !== 'on'} onClick={() => void set(true)}>
          Turn on
        </button>
        <button type="button" className="primary" disabled={busy || !on} onClick={() => void set(false)}>
          Turn off
        </button>
      </div>
      {s.switch.master !== 'on' && (
        <p className="state-note" role="status" data-testid="admin-master-off">
          The switch on the box is off, so the models stay off whatever this page says. It is turned on only on the box.
        </p>
      )}
      {note && (
        <p className="state-note error" role="alert" data-testid="admin-note">
          {note}
        </p>
      )}
      <dl>
        <dt>Switch on the box</dt>
        <dd data-testid="admin-master">{s.switch.master}</dd>
        <dt>This page</dt>
        <dd data-testid="admin-page">{s.switch.page === 'unset' ? 'not set yet (off)' : s.switch.page}</dd>
        <dt>Models</dt>
        <dd data-testid="admin-models">{s.models.state}</dd>
        {s.idleReleaseInMinutes !== null && (
          <>
            <dt>Released in</dt>
            <dd>about {s.idleReleaseInMinutes} min without questions</dd>
          </>
        )}
        {s.release.pending && (
          <>
            <dt>Release</dt>
            <dd data-testid="admin-release">
              not confirmed ({s.release.reason}): {s.release.problem ?? 'checking'}
              {s.release.nextCheckInSec !== undefined ? `; next check in ${s.release.nextCheckInSec} s` : ''}
            </dd>
          </>
        )}
        <dt>Queue</dt>
        <dd>
          {s.queue.running ? 'one running' : 'idle'}, {s.queue.waiting} waiting
        </dd>
        <dt>Today ({s.today.day})</dt>
        <dd data-testid="admin-today">{outcomes.length ? outcomes.map(([k, v]) => `${k} ${v}`).join(', ') : 'nothing yet'}</dd>
      </dl>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Admin />);
