import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const s=fs.readFileSync(new URL('../netlify/functions/catalog-readonly.mjs',import.meta.url),'utf8');

test('response exposes catalog comparison data but never serializes seller credentials',()=>{
  assert.match(s,/items:/);
  assert.match(s,/modifierLists:/);
  const responseStart=s.indexOf("return json({mode:'production-read-only'");
  const responseEnd=s.indexOf('  }catch(error)',responseStart);
  assert.ok(responseStart>=0&&responseEnd>responseStart);
  const responseModel=s.slice(responseStart,responseEnd);
  assert.doesNotMatch(responseModel,/access_token|refresh_token|application_secret|adminKey|encryptionKey/);
  assert.doesNotMatch(responseModel,/\btoken\s*:/);
});
