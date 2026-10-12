import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../../app/src/main/assets/live-square-catalog.js',import.meta.url),'utf8');
test('Android placeholder cannot send credentials to the private Square endpoint',()=>{
  assert.match(source,/credentials:'omit'/);
  assert.match(source,/LHV4RK9G8JN4T/);
});
test('Android placeholder contains no Square OAuth credentials',()=>{
  assert.doesNotMatch(source,/Bearer\s/i);
  assert.doesNotMatch(source,/access_token|refresh_token|APPLICATION_SECRET/i);
});
