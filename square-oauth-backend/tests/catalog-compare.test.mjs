import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const page=fs.readFileSync(new URL('../public/catalog-compare.html',import.meta.url),'utf8');
const reader=fs.readFileSync(new URL('../public/live-square-catalog.js',import.meta.url),'utf8');
test('comparison page uses authenticated shared read-only catalog reader',()=>{
  assert.match(page,/live-square-catalog\.js/);
  assert.match(reader,/\/api\/square\/catalog-readonly/);
  assert.match(reader,/credentials:'same-origin'/);
  assert.doesNotMatch(reader,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
});
test('comparison page clearly labels itself read-only',()=>assert.match(page,/Read-only view/));
