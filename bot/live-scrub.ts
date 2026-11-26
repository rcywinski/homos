/**
 * bot/live-scrub.ts — the Live demo writes no URL to any log (phase 5, step 5.6; ai/APP-PLAN.md section 12).
 * A paid RPC key, if one is ever configured through RPC_MAINNET, RPC_BASE or RPC_ARBITRUM, sits inside the URL, and a
 * viem error that ends a fallback (every host failed) carries "URL: ..." in its message. In Live mode every log line
 * passes through scrubUrls: the observer's own log() (file and console) and, through installConsoleScrub, anything the
 * advisor or a library prints to the console.
 */

/** Replaces every http(s) or ws(s) URL with "[url]", keeping the host when it carries no path, query or credentials. */
export function scrubUrls(text: string): string {
  return text.replace(/\b(?:https?|wss?):\/\/[^\s"'<>)\]]+/gi, (u) => {
    try {
      const url = new URL(u);
      const bare = !url.username && !url.password && (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
      return bare ? `[url ${url.host}]` : '[url]';
    } catch {
      return '[url]';
    }
  });
}

/** Wraps console.log, info, warn and error so that every string argument is scrubbed (Live mode only). */
export function installConsoleScrub(target: Pick<Console, 'log' | 'info' | 'warn' | 'error'> = console): void {
  for (const k of ['log', 'info', 'warn', 'error'] as const) {
    const orig = target[k].bind(target);
    target[k] = (...args: unknown[]) => orig(...args.map((a) => (typeof a === 'string' ? scrubUrls(a) : a instanceof Error ? scrubUrls(String(a.stack ?? a)) : a)));
  }
}
