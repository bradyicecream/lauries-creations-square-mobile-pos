import { createHmac, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';

export const randomNonce = () => randomBytes(32).toString('base64url');
export function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function signSession(secret, now = Date.now()) {
  if (!secret || secret.length < 24) throw new Error('Admin key not configured');
  const expiry = String(now + 30 * 60_000);
  const nonce = randomNonce();
  const body = expiry + '.' + nonce;
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + mac;
}
export function verifySession(cookie, secret, now = Date.now()) {
  if (!secret || secret.length < 24 || !cookie) return false;
  const match = /^(\d{13})\.([a-zA-Z0-9_-]{32,})\.([a-zA-Z0-9_-]{43})$/.exec(cookie);
  if (!match || Number(match[1]) <= now || Number(match[1]) > now + 30 * 60_000) return false;
  const signed = match[1] + '.' + match[2];
  const expected = createHmac('sha256', secret).update(signed).digest('base64url');
  return secureEqual(match[3], expected);
}
export function parseCookie(header, name) {
  const found = String(header || '').split(';').map(x => x.trim())
    .find(part => part.startsWith(name + '='));
  if (!found) return '';
  try { return decodeURIComponent(found.slice(name.length + 1)); } catch { return ''; }
}
export function keyFromEnv(raw) {
  if (!raw) throw new Error('Missing encryption key');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32 || key.toString('base64') !== raw) throw new Error('Encryption key must be base64 for 32 bytes');
  return key;
}
export function encryptObject(value, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Invalid encryption key');
  const iv = randomBytes(12),cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return JSON.stringify({v:1,iv:iv.toString('base64'),data:encrypted.toString('base64'),
    tag:cipher.getAuthTag().toString('base64')});
}
export function decryptObject(payload, key) {
  const input = JSON.parse(payload);
  if (input?.v !== 1) throw new Error('Unknown encryption record version');
  const iv = Buffer.from(input.iv, 'base64'),tag = Buffer.from(input.tag, 'base64');
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted record');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decoded = Buffer.concat([decipher.update(Buffer.from(input.data, 'base64')), decipher.final()]);
  return JSON.parse(decoded.toString('utf8'));
}
export const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g,
  char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
