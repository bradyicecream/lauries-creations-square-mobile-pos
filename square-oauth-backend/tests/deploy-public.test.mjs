import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

test('production setup page exists in Netlify public directory', async () => {
  await assert.doesNotReject(() => access(new URL('../public/production-payments.html', import.meta.url), constants.R_OK));
});
