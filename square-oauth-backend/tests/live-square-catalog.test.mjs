import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/live-square-catalog.js',import.meta.url),'utf8');
test('browser reader is pinned to O.P. Gallo Mobile and sends session cookie only to same origin',()=>{
  assert.match(source,/LHV4RK9G8JN4T/);
  assert.match(source,/credentials:'same-origin'/);
  assert.match(source,/mode!=='production-read-only'/);
});
test('browser reader contains no Square secrets or bearer token handling',()=>{
  assert.doesNotMatch(source,/Bearer\s/i);
  assert.doesNotMatch(source,/access_token|refresh_token|APPLICATION_SECRET/i);
});
