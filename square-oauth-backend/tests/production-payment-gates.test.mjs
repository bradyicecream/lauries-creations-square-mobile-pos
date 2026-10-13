import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const oauth=fs.readFileSync(new URL('../netlify/functions/oauth.mjs',import.meta.url),'utf8');
const pair=fs.readFileSync(new URL('../netlify/functions/production-pair.mjs',import.meta.url),'utf8');
const catalog=fs.readFileSync(new URL('../netlify/functions/catalog-readonly.mjs',import.meta.url),'utf8');
test('production OAuth requests payment permissions only on explicit start',()=>{
  assert.match(oauth,/PAYMENTS_WRITE_IN_PERSON/);
  assert.match(oauth,/payments-start/);
  assert.match(oauth,/scope:payments\?PAYMENT_SCOPES:SCOPES/);
  assert.match(oauth,/payments\.\.'/);
  assert.match(oauth,/token\/status/);
  assert.match(oauth,/authorized-payments-v1/);
  assert.match(oauth,/SQUARE_EXPECTED_MERCHANT_ID/);
});
test('catalog endpoint remains read-only',()=>{
  assert.match(catalog,/req\.method!=='GET'/);
  assert.doesNotMatch(catalog,/PAYMENTS_WRITE/);
  assert.doesNotMatch(catalog,/production-pair/);
});
test('native pairing requires administrator session and origin on code generation',()=>{
  assert.match(pair,/verifySession/);
  assert.match(pair,/req\.headers\.get\('origin'\)/);
  assert.match(pair,/req\.method!=='POST'/);
  assert.match(pair,/randomBytes\(24\)/);
  assert.match(pair,/expires:Date\.now\(\)\+5\*60_000/);
  assert.match(pair,/await store\.delete\(lookup\)/);
  assert.match(pair,/decryptObject/);
});
test('production token is only returned to a bearer-code redeemed native client',()=>{
  assert.match(pair,/production-redeem/);
  assert.match(pair,/production-device-code-\+digest/);
  assert.match(pair,/validatedToken\(\)/);
  assert.match(pair,/production',locationId:LOCATION,accessToken:token\.access_token/);
  assert.match(pair,/SQUARE_EXPECTED_MERCHANT_ID/);
  assert.match(pair,/payment_permissions_unverified/);
  assert.match(pair,/location_not_active/);
  assert.doesNotMatch(pair,/<script|localStorage|sessionStorage/);
});
