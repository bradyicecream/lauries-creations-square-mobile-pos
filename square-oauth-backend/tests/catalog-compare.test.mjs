import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const page=fs.readFileSync(new URL('../public/catalog-compare.html',import.meta.url),'utf8');
test('comparison page uses only the read-only catalog endpoint',()=>{
  assert.match(page,/\/api\/square\/catalog-readonly/);
  assert.match(page,/credentials:'same-origin'/);
  assert.doesNotMatch(page,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
});
test('comparison page clearly labels itself read-only',()=>assert.match(page,/Read-only view/));
