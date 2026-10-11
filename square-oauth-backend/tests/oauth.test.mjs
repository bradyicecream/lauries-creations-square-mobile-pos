import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {randomNonce,secureEqual,signSession,verifySession,parseCookie,keyFromEnv,
  encryptObject,decryptObject,escapeHTML} from '../netlify/functions/auth-helpers.mjs';

test('OAuth state nonce has cryptographic entropy and URL-safe encoding',()=>{
 const a=randomNonce(),b=randomNonce();
 assert.match(a,/^[\w-]{43}$/);
 assert.notEqual(a,b);
 assert.ok(secureEqual(a,a));
 assert.ok(!secureEqual(a,b));
 assert.equal(secureEqual('', 'x'),false);
});
test('Admin session is signed, expires and resists changes',()=>{
 const secret='a'.repeat(40),now=Date.now(),cookie=signSession(secret,now);
 assert.equal(verifySession(cookie,secret,now+1000),true);
 assert.equal(verifySession(cookie,secret,now+30*60_000+10),false);
 assert.equal(verifySession(cookie,secret+'bad',now+1000),false);
 assert.equal(verifySession(cookie.replace(/.$/,'x'),secret,now+1000),false);
 assert.equal(verifySession('not-a-cookie',secret),false);
});
test('Cookie parser safely matches exact name only',()=>{
 assert.equal(parseCookie('other=x; laurie_admin_session=abc%2Fdef; session=abc','laurie_admin_session'),'abc/def');
 assert.equal(parseCookie('laurie_admin_session_suffix=x','laurie_admin_session'),'');
});
test('AES-256-GCM encrypts merchant tokens and detects tampering',()=>{
 const key=randomBytes(32),record={merchant_id:'merchant-123',access_token:'private-access',
   refresh_token:'private-refresh',expires_at:'2026-11-01T10:00:00Z'};
 const encrypted=encryptObject(record,key);
 assert.ok(!encrypted.includes('private-access'));
 assert.ok(!encrypted.includes('private-refresh'));
 assert.deepEqual(decryptObject(encrypted,key),record);
 assert.throws(()=>decryptObject(encrypted,randomBytes(32)));
 const tampered=JSON.parse(encrypted);tampered.tag=Buffer.alloc(16).toString('base64');
 assert.throws(()=>decryptObject(JSON.stringify(tampered),key));
});
test('Encryption-key validation and escaping',()=>{
 const key=randomBytes(32),encoded=key.toString('base64');
 assert.deepEqual(keyFromEnv(encoded),key);
 assert.throws(()=>keyFromEnv('too-short'));
 assert.throws(()=>keyFromEnv(''));
 assert.equal(escapeHTML('<bad "text" &()>'),'&lt;bad &quot;text&quot; &amp;()&gt;');
});
