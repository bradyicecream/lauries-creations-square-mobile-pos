import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../netlify/functions/catalog-readonly.mjs',import.meta.url),'utf8');

test('bridge is pinned to verified O.P. Gallo Mobile location',()=>{
  assert.match(source,/LHV4RK9G8JN4T/);
  assert.match(source,/MLC73J5K5F9SB/);
});

test('bridge only implements GET and never exposes token fields in response model',()=>{
  assert.match(source,/req\.method!=='GET'/);
  assert.doesNotMatch(source,/access_token\s*:/);
  assert.doesNotMatch(source,/refresh_token\s*:/);
});

test('bridge requests items and modifier lists read-only',()=>{
  assert.match(source,/types=ITEM/);
  assert.match(source,/types=MODIFIER_LIST/);
  assert.doesNotMatch(source,/method:\s*['"]POST['"]/);
  assert.doesNotMatch(source,/method:\s*['"]PUT['"]/);
  assert.doesNotMatch(source,/method:\s*['"]DELETE['"]/);
});
