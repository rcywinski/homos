/**
 * Display-only masking of private network addresses (phase 4, owner decision of 16 Nov 2026).
 *
 * The journal quotes the box's LAN address, the LAN subnet and the VPN subnet (for example the firewall rule for the
 * old bot API). They are private ranges and already public in the repo, but the showcase never shows them. Masking is
 * applied to text on its way to a visitor (quotes, answers, reports), never to the corpus: the corpus hash and every
 * evaluation result stay as they are. Verification always runs on the unmasked text first.
 */

export const MASK = '[private address]';

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
/** First octets of the private and shared ranges: 10/8, 172.16/12, 192.168/16, 100.64/10 (VPN and CGNAT). */
const PRIVATE_PREFIX = `(?:10\\.${OCTET}|172\\.(?:1[6-9]|2\\d|3[01])|192\\.168|100\\.(?:6[4-9]|[7-9]\\d|1[01]\\d|12[0-7]))`;
/** Optional suffix: a prefix length (/24), a dotted netmask (/255.255.255.0) and a port (:8787). */
const SUFFIX = `(?:\\/(?:${OCTET}(?:\\.${OCTET}){3}|\\d{1,2}))?(?::\\d{1,5})?`;

/**
 * Four dotted octets in a private range, not glued to other digits or dots on either side, so a version number such
 * as 110.8.0.1 or a date such as 10.11.2026 is left alone.
 */
const ADDRESS = new RegExp(`(?<![\\d.])${PRIVATE_PREFIX}\\.${OCTET}\\.${OCTET}${SUFFIX}(?![\\d])(?!\\.\\d)`, 'g');

export function maskNetwork(text: string): string {
  return text.replace(ADDRESS, MASK);
}

/** True when the text still holds an address the mask would replace (used by the export check). */
export function hasPrivateAddress(text: string): boolean {
  ADDRESS.lastIndex = 0;
  const found = ADDRESS.test(text);
  ADDRESS.lastIndex = 0;
  return found;
}
