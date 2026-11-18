/**
 * Tests for the display-only network address mask (phase 4, step 4.1). Offline, no models.
 * Run: npx tsx ai/serve/mask.test.ts
 */
import { readFileSync, readdirSync } from 'fs';
import { hasPrivateAddress, MASK, maskNetwork } from './mask';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
function same(name: string, input: string, expected: string) {
  const got = maskNetwork(input);
  check(name, got === expected, `got ${JSON.stringify(got)}`);
}

// Forms found in the corpus on 16 Nov 2026 (journal/CONTEXT.md, journal/TASKS-WINDOWS.md, inference notes).
same('LAN address in bold', 'LAN: **192.168.1.8**, port 8787.', `LAN: **${MASK}**, port 8787.`);
same('address with port and path', 'curl http://192.168.1.8:8787/health', `curl http://${MASK}/health`);
same('Ollama port in backticks', '`192.168.1.8:11434`)', `\`${MASK}\`)`);
same('two subnets with prefix length', 'LAN 192.168.1.0/24 + VPN 10.8.0.0/24) skons', `LAN ${MASK} + VPN ${MASK}) skons`);
same('subnets joined by a comma', 'remoteip=192.168.1.0/24,10.8.0.0/24', `remoteip=${MASK},${MASK}`);
same('dotted netmask', '192.168.1.0/255.255.255.0', MASK);
same('/25 split', '192.168.1.0/25 i 10.8.0.0/25', `${MASK} i ${MASK}`);
same('172.16/12 and CGNAT', '172.20.1.4 oraz 100.100.1.2', `${MASK} oraz ${MASK}`);

// Must stay untouched: public addresses, dates, versions, prices and numbers that look close to an address.
same('public address', 'RPC 8.8.8.8 i 1.1.1.1', 'RPC 8.8.8.8 i 1.1.1.1');
same('date with dots', 'Zamknięte 10.11.2026 o 10:38', 'Zamknięte 10.11.2026 o 10:38');
same('version glued to a digit', 'wersja 110.8.0.1', 'wersja 110.8.0.1');
same('longer dotted run', '10.8.0.1.5 to nie adres', '10.8.0.1.5 to nie adres');
same('172 outside the private block', '172.32.0.1', '172.32.0.1');
same('100 outside the shared block', '100.63.0.1 i 100.128.0.1', '100.63.0.1 i 100.128.0.1');
same('three-part number', 'range 10.8.0 only', 'range 10.8.0 only');
same('dollar amounts', '~$1.9k i ~$2.9k, 192 zł', '~$1.9k i ~$2.9k, 192 zł');
same('empty', '', '');

check('repeated calls give the same result (no regex state leak)', maskNetwork('10.8.0.2') === MASK && maskNetwork('10.8.0.2') === MASK);
check('hasPrivateAddress finds an address', hasPrivateAddress('x 192.168.1.8 y'));
check('hasPrivateAddress twice in a row', hasPrivateAddress('192.168.1.8') && hasPrivateAddress('192.168.1.8'));
check('hasPrivateAddress on clean text', !hasPrivateAddress('nothing here 10.11.2026'));
check('masked text is clean', !hasPrivateAddress(maskNetwork('a 192.168.1.8:8787 b 10.8.0.0/24 c')));

// The real corpus: every journal and docs file is clean after masking, and the mask hits the known files.
const files = [
  ...readdirSync('journal').filter((f) => f.endsWith('.md')).map((f) => `journal/${f}`),
  ...readdirSync('journal/reports').filter((f) => f.endsWith('.md')).map((f) => `journal/reports/${f}`),
  ...readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`),
];
const withAddresses = files.filter((f) => hasPrivateAddress(readFileSync(f, 'utf8')));
check('the corpus has addresses to mask', withAddresses.includes('journal/CONTEXT.md'), withAddresses.join(', '));
for (const f of files) {
  const masked = maskNetwork(readFileSync(f, 'utf8'));
  check(`no address left in ${f}`, !hasPrivateAddress(masked));
}

console.log(`mask: ${passed} passed, ${failed} failed (${withAddresses.length} corpus files had addresses)`);
if (failed > 0) process.exit(1);
