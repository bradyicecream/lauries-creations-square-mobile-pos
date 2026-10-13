import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../netlify/functions/oauth.mjs',import.meta.url),'utf8');

test('admin session cookie is available to full private site',()=>{
  assert.ok(source.includes("'laurie_admin_session='+encodeURIComponent(session)+"));
  assert.ok(source.includes("'; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Lax'"));
});

test('authenticated dashboard links to full catalog comparison',()=>{
  assert.ok(source.includes('href="/catalog-compare.html">Full catalog comparison</a>'));
});
