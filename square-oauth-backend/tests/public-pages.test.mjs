import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../public/production-payments.html', import.meta.url);

test('production payment setup page is present and remains non-activating', async () => {
  const html = await readFile(pageUrl, 'utf8');
  assert.match(html, /Administrator production payment authorization setup/i);
  assert.match(html, /Production payments are NOT active/i);
  assert.match(html, /BLOCKED — setup incomplete/i);
  assert.doesNotMatch(html, /type=["']?submit/i);
});
