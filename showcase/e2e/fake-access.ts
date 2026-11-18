/**
 * Test-only stand-in for Cloudflare Access's key endpoint (step 4.10c). Makes an RSA key pair at start, serves the
 * public key as JWKS on /certs, and writes the private key to the system temp folder for the browser suite to sign
 * Cf-Access-Jwt-Assertion tokens. No key is ever committed.
 *   node --import tsx showcase/e2e/fake-access.ts <port>
 */
import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

export const FAKE_ACCESS_KEY_FILE = path.join(os.tmpdir(), 'homos-e2e-access-key.pem');

const port = Number(process.argv[2] ?? 8809);
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
writeFileSync(FAKE_ACCESS_KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }));
const jwks = JSON.stringify({ keys: [{ ...(publicKey.export({ format: 'jwk' }) as object), kid: 'e2e', kty: 'RSA', alg: 'RS256' }] });
http
  .createServer((req, res) => {
    if (req.url === '/certs' || req.url === '/') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(jwks);
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(port, '127.0.0.1');
