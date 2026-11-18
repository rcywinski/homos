/**
 * The owner switch with the admin page (phase 4, step 4.10c).
 *
 * Two files:
 *   - the master, SERVE_SWITCH_FILE (C:\HomosServe\SWITCH on the box): written by the owner on the box only; the
 *     server can read it, never write it;
 *   - the page's state, SERVE_ADMIN_STATE_FILE (C:\HomosServe\state\admin-switch on the box): written by the server
 *     when the owner presses on or off on the admin page, in a folder where nothing else lives.
 * The models may load only when the master says "on" and the page's state allows it. With the admin page configured, a
 * missing state file means "off" (review of 18 Nov 2026: setting the master on so the page can work must not open the
 * GPU to visitors before the owner presses anything). Without the admin page, the state file is ignored and the
 * master alone decides, as before.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import path from 'path';

const readWord = (file: string): string | null => {
  try {
    return readFileSync(file, 'utf8').trim().toLowerCase();
  } catch {
    return null;
  }
};

/** The effective switch from the two files: the truth table the tests check. */
export function effectiveOn(master: string | null, admin: string | null, pageConfigured: boolean): boolean {
  if (master !== 'on') return false;
  if (!pageConfigured) return true;
  return admin === 'on';
}

export class OwnerSwitch {
  constructor(
    private readonly masterFile: string,
    private readonly stateFile: string,
    private readonly pageConfigured: boolean,
    private readonly logFile?: string,
    private readonly now: () => number = Date.now,
  ) {}

  master(): 'on' | 'off' {
    return readWord(this.masterFile) === 'on' ? 'on' : 'off';
  }

  /** The page's state as stored; "unset" when the file does not exist yet. */
  page(): 'on' | 'off' | 'unset' {
    const w = readWord(this.stateFile);
    return w === 'on' ? 'on' : w === null ? 'unset' : 'off';
  }

  on(): boolean {
    return effectiveOn(readWord(this.masterFile), readWord(this.stateFile), this.pageConfigured);
  }

  /**
   * Sets the page's state. Turning on is refused while the master is off (the page cannot override the owner's box
   * switch). Writes atomically and appends one line to the admin log: time, from, to, who ("owner", never the
   * address).
   */
  set(to: 'on' | 'off'): { ok: true; from: string } | { ok: false; reason: 'master-off' } {
    if (to === 'on' && this.master() !== 'on') return { ok: false, reason: 'master-off' };
    const from = this.page();
    mkdirSync(path.dirname(this.stateFile), { recursive: true });
    const tmp = `${this.stateFile}.tmp`;
    writeFileSync(tmp, `${to}\n`);
    renameSync(tmp, this.stateFile);
    if (this.logFile) {
      mkdirSync(path.dirname(this.logFile), { recursive: true });
      appendFileSync(this.logFile, JSON.stringify({ t: new Date(this.now()).toISOString(), from, to, who: 'owner' }) + '\n');
    }
    return { ok: true, from };
  }
}
