/**
 * Security headers for every response of the public server (phase 4, step 4.7, M2).
 *
 * The content security policy is the one in showcase/public/index.html (a meta tag, so the page is also protected
 * when it is served without this server, for example by the webpack dev server), plus frame-ancestors 'none', which a
 * meta tag cannot set. A test keeps the two in sync.
 */
import type { NextFunction, Request, Response } from 'express';

/**
 * Same origin only; no inline script or style; no eval; nothing from third-party hosts. One exception (step 4.6c):
 * `connect-src` also allows https://api.anthropic.com, the only place guest-key mode sends the visitor's key. Nothing
 * else changes: no third-party script, style, font, image or frame source.
 */
export const GUEST_API_ORIGIN = 'https://api.anthropic.com';
export const CSP_META = `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ${GUEST_API_ORIGIN}; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'`;

export const CSP_HEADER = `${CSP_META}; frame-ancestors 'none'`;

export const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': CSP_HEADER,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), browsing-topics=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-frame-options': 'DENY',
};

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set(SECURITY_HEADERS);
  next();
}
