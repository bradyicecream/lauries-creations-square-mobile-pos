/* Dedicated single-merchant Square production OAuth backend.
   Catalog access remains read-only. Payment privileges require a separate, explicit consent flow.
   Deployment intentionally refuses to authorize when any private env setting is missing.
*/
import {getStore} from '@netlify/blobs';
import {randomNonce,secureEqual,signSession,verifySession,parseCookie,keyFromEnv,
  encryptObject,decryptObject,escapeHTML as h} from './auth-helpers.mjs';

const API_VERSION='2026-09-16';
const SCOPES='MERCHANT_PROFILE_READ ITEMS_READ';
const PAYMENT_SCOPES='MERCHANT_PROFILE_READ ITEMS_READ PAYMENTS_WRITE PAYMENTS_WRITE_IN_PERSON';
const PAYMENT_TOKEN_KEY='authorized-payments-v1';
const MOBILE_LOCATION_ID='LHV4RK9G8JN4T';
const STORE_NAME='lauries-square-oauth-private';
const TOKEN_KEY='authorized-seller-v1';
const SECRET_KEYS=['SQUARE_APPLICATION_ID','SQUARE_APPLICATION_SECRET',
  'LAURIE_OAUTH_ADMIN_KEY','LAURIE_OAUTH_ENCRYPTION_KEY','SQUARE_REDIRECT_URI'];
const setting=name=>globalThis.Netlify?.env?.get(name)||process.env[name]||'';
const configured=()=>SECRET_KEYS.every(k=>Boolean(setting(k)))&&
  /^https:\/\/[a-z0-9.-]+\/oauth\/callback$/.test(setting('SQUARE_REDIRECT_URI'));
const noStoreHeaders={'cache-control':'no-store, private','pragma':'no-cache',
  'referrer-policy':'no-referrer','x-content-type-options':'nosniff',
  'x-frame-options':'DENY','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
const response=(body,status=200,additionalHeaders={})=>new Response(body,
  {status,headers:{...noStoreHeaders,'content-type':'text/html; charset=utf-8',...additionalHeaders}});
const page=(title,body)=>'<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">'+
  '<meta name="referrer" content="no-referrer"><title>'+h(title)+'</title><style>'+
  'body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:#f5f3f8;color:#29212f;padding:20px}'+
  'main{max-width:550px;margin:7vh auto;background:white;border-radius:16px;padding:26px;box-shadow:0 5px 23px #1c142218}'+
  'h1{font-size:22px;color:#673b85}p{line-height:1.6}a{color:#603985;font-weight:700}li{margin:10px 0}'+
  '.button{display:inline-block;background:#6a3f8c;color:white;border-radius:8px;padding:13px 18px;text-decoration:none}'+
  'small{color:#8c8490}</style></head><body><main><h1>✦ Laurie’s Creations</h1>'+
  '<h2>'+h(title)+'</h2>'+body+
  '<p><small>Read-only Square connection • No payments • Private admin access</small></p></main></body></html>';
const html=(title,body,status=200,headers={})=>response(page(title,body),status,headers);
const redirect=(path,headers={})=>new Response(null,{status:303,headers:{...noStoreHeaders,location:path,...headers}});
const unauth=()=>html('Admin sign-in required',
  '<p>Open the <a href="/">secure connection page</a> and sign in with your private administrator passphrase.</p>',401);
const cookies=(req)=>req.headers.get('cookie')||'';
const authorized=req=>verifySession(parseCookie(cookies(req),'laurie_admin_session'),
  setting('LAURIE_OAUTH_ADMIN_KEY'));
const sessionCookie=session=>'laurie_admin_session='+encodeURIComponent(session)+
  '; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Lax';
const stateCookie=state=>'laurie_oauth_state='+encodeURIComponent(state)+
  '; Path=/oauth/callback; Max-Age=600; Secure; HttpOnly; SameSite=Lax';
const clearState='laurie_oauth_state=; Path=/oauth/callback; Max-Age=0; Secure; HttpOnly; SameSite=Lax';
const blob=()=>getStore(STORE_NAME);
async function getSaved(key=TOKEN_KEY){
  const stored=await blob().get(key);
  return stored?decryptObject(stored,keyFromEnv(setting('LAURIE_OAUTH_ENCRYPTION_KEY'))):null;
}
async function saveToken(record,key=TOKEN_KEY){
  await blob().set(key,encryptObject(record,keyFromEnv(setting('LAURIE_OAUTH_ENCRYPTION_KEY'))));
}
async function squareTokenRequest(body){
  const reply=await fetch('https://connect.squareup.com/oauth2/token',
    {method:'POST',headers:{'content-type':'application/json','Square-Version':API_VERSION},
      body:JSON.stringify(body)});
  const data=await reply.json().catch(()=>({}));
  if(!reply.ok || !data.access_token || !data.refresh_token)throw new Error('Square token exchange rejected');
  return data;
}
async function access(){
  const saved=await getSaved();
  if(!saved || !saved.access_token)return null;
  if(Date.parse(saved.expires_at||'')>Date.now()+5*60_000)return saved;
  if(!saved.refresh_token)return null;
  const fresh=await squareTokenRequest({
    client_id:setting('SQUARE_APPLICATION_ID'),client_secret:setting('SQUARE_APPLICATION_SECRET'),
    grant_type:'refresh_token',refresh_token:saved.refresh_token});
  const merged={...saved,...fresh,merchant_id:fresh.merchant_id||saved.merchant_id,
    refresh_token:fresh.refresh_token||saved.refresh_token};
  await saveToken(merged);
  return merged;
}
async function squareGet(endpoint){
  const credentials=await access();
  if(!credentials)throw new Error('No Square account authorized');
  const reply=await fetch('https://connect.squareup.com'+endpoint,{headers:{
    authorization:'Bearer '+credentials.access_token,'Square-Version':API_VERSION,
    accept:'application/json'}});
  if(!reply.ok)throw new Error('Square read-only API returned '+reply.status);
  return reply.json();
}
async function login(req){
  if(req.method!=='POST')return html('Method not allowed','<p>Use the sign-in form.</p>',405);
  if(!configured())return html('Private setup required',
    '<p>Configure the required environment variables for Netlify Functions before signing in. No Square connection has been initiated.</p>',503);
  let input;
  try{input=await req.formData();}catch{return html('Invalid request','<p>Use the sign-in form.</p>',400);}
  const key=String(input.get('admin_key')||'');
  if(!secureEqual(key,setting('LAURIE_OAUTH_ADMIN_KEY')))
    return html('Sign-in unsuccessful','<p>Incorrect administrator passphrase. <a href="/">Try again</a>.</p>',401);
  return redirect('/oauth/status',{'set-cookie':sessionCookie(signSession(setting('LAURIE_OAUTH_ADMIN_KEY')))});
}
async function start(req,payments=false){
  if(req.method!=='GET')return html('Method not allowed','',405);
  // Prefix is included in the signed same-site state cookie; only a deliberate admin action enables payment scope.
  const state=(payments?'payments.':'')+randomNonce();
  const params=new URLSearchParams({client_id:setting('SQUARE_APPLICATION_ID'),
    scope:payments?PAYMENT_SCOPES:SCOPES,state,session:'false'});
  const uri='https://connect.squareup.com/oauth2/authorize?'+params.toString();
  return redirect(uri,{'set-cookie':stateCookie(state)});
}
async function callback(req,url){
  const state=url.searchParams.get('state');
  const cookie=parseCookie(cookies(req),'laurie_oauth_state');
  const invalid=!state || !secureEqual(state,cookie);
  const headers={'set-cookie':clearState};
  if(invalid)return html('Authorization verification failed',
    '<p>The Square callback state does not match this session. Start the connection again from your private dashboard.</p>',403,headers);
  if(url.searchParams.has('error'))return html('Authorization not approved',
    '<p>Square authorization was not completed. No Square tokens were saved.</p>',400,headers);
  const isPayments=state.startsWith('payments.');
  const code=url.searchParams.get('code');
  if(!code||code.length>200)return html('Missing authorization code','<p>Square did not send a valid code.</p>',400,headers);
  try{
    const token=await squareTokenRequest({client_id:setting('SQUARE_APPLICATION_ID'),
      client_secret:setting('SQUARE_APPLICATION_SECRET'),code,grant_type:'authorization_code'});
    const expected=setting('SQUARE_EXPECTED_MERCHANT_ID');
    if(expected && token.merchant_id!==expected)throw new Error('Unexpected merchant account');
    if(isPayments){
      // OAuth callback alone does not establish payment rights. Verify actual token capabilities with Square.
      const check=await fetch('https://connect.squareup.com/oauth2/token/status',{
        method:'POST',headers:{authorization:'Bearer '+token.access_token,'Square-Version':API_VERSION,
          'content-type':'application/json'},body:'{}'});
      const status=await check.json().catch(()=>({}));
      const actual=Array.isArray(status.scopes)?status.scopes:[];
      if(!check.ok||status.merchant_id!==token.merchant_id||status.client_id!==setting('SQUARE_APPLICATION_ID')||
        !PAYMENT_SCOPES.split(' ').every(scope=>actual.includes(scope)))throw new Error('Payment rights not granted');
      await saveToken({access_token:token.access_token,refresh_token:token.refresh_token,
        expires_at:token.expires_at,merchant_id:token.merchant_id,scopes:actual,
        authorized_at:new Date().toISOString()},PAYMENT_TOKEN_KEY);
      // A newly authorized payment token also contains the read scopes; keep catalog access working.
      await saveToken({access_token:token.access_token,refresh_token:token.refresh_token,
        expires_at:token.expires_at,merchant_id:token.merchant_id,scopes:actual,
        authorized_at:new Date().toISOString()});
    }else{
      await saveToken({access_token:token.access_token,refresh_token:token.refresh_token,
        expires_at:token.expires_at,merchant_id:token.merchant_id,scopes:SCOPES.split(' '),
        authorized_at:new Date().toISOString()});
    }
    return redirect(isPayments?'/oauth/payments-status':'/oauth/status',headers);
  }catch{
    return html('Connection could not be completed',
      '<p>Authorization failed or encrypted token storage was unavailable. No credentials are displayed. Check secure server configuration and retry.</p>',502,headers);
  }
}
async function status(){
  let record=null;
  try{record=await getSaved();}catch{
    return html('Secure storage unavailable','<p>Encrypted token storage is not ready. Confirm Netlify Blobs and the encryption environment variable are correctly configured.</p>',503);
  }
  return html('Square connection status',
    '<p><strong>'+ (record?'A Square account has authorized read-only access.':'No Square account authorized yet.')+'</strong></p>'+
    (record?'<p>Merchant ID: <code>'+h(record.merchant_id)+'</code></p>'+
      '<p>Permissions: <strong>Merchant profile and item catalog (read-only)</strong>.</p>'+
      '<p><a href="/oauth/locations">View Square business locations</a> · <a href="/oauth/catalog">Preview item names</a></p><p><a class="button" href="/catalog-compare.html">Full catalog comparison</a></p>':
      '<p>When ready, sign in to your actual Square account and approve the two read-only permissions.</p>')+
    '<p><a class="button" href="/oauth/start">'+(record?'Reauthorize Square':'Connect Square securely')+'</a></p>'+
    '<p><a href="/oauth/payments-status">Production payment authorization and secure device pairing</a></p>'+
    '<p><small>Nothing is synchronized with the Android register automatically. Real payments require separate consent, device signing and hardware checks.</small></p>');
}
async function paymentsStatus(){
  let record=null;
  try{record=await getSaved(PAYMENT_TOKEN_KEY);}catch{
    return html('Secure storage unavailable','<p>Unable to read encrypted payment authorization.</p>',503);
  }
  const permissions=['MERCHANT_PROFILE_READ','PAYMENTS_WRITE','PAYMENTS_WRITE_IN_PERSON'];
  const ready=record&&permissions.every(p=>record.scopes?.includes(p))&&
    record.merchant_id===setting('SQUARE_EXPECTED_MERCHANT_ID')&&
    Boolean(setting('SQUARE_EXPECTED_MERCHANT_ID'));
  return html('Production payment authorization',
    '<p><strong>'+(ready?'Square payment permissions have been authorized.':'Production payments are not authorized yet.')+'</strong></p>'+
    '<p>Read-only catalog access remains independent. Granting payment permissions requires an explicit Square approval.</p>'+
    '<p><a class="button" href="/oauth/payments-start">'+(ready?'Reauthorize payment permissions':'Authorize payment permissions')+'</a></p>'+
    (ready?'<p><strong>Pair a register:</strong> Create a one-time code for the production Android app. Never share the code publicly.</p>'+
      '<form action="/api/square/production-pair" method="POST"><button class="button" type="submit">Create pairing code</button></form>':
      '<p>No register can take live payments until authorization, a production-signed app, and a compatible reader have been checked.</p>')+
    '<p>Required Square location: '+h(MOBILE_LOCATION_ID)+'</p>'+
    '<p><a href="/oauth/status">Back to catalog connection</a></p>');
}
async function locations(){
  try{
    const data=await squareGet('/v2/locations');
    const rows=(data.locations||[]).map(l=>'<li><strong>'+h(l.name||'Unnamed location')+'</strong>'+
      '<br>Location ID: <code>'+h(l.id)+'</code>'+
      ' · Status: '+h(l.status||'Unknown')+'</li>').join('');
    return html('Square locations','<p>Verify the exact Square location for your Laurie’s Creations register before enabling any catalog sync or transaction writes.</p>'+
      '<ul>'+(rows||'<li>No locations returned for this seller.</li>')+'</ul><p><a href="/oauth/status">Back to dashboard</a></p>');
  }catch{
    return html('Unable to read Square locations','<p>Ensure the account is authorized, then retry. Tokens are never displayed in the browser.</p><a href="/oauth/status">Back</a>',502);
  }
}
async function catalog(){
  try{
    const data=await squareGet('/v2/catalog/list?types=ITEM');
    const items=(data.objects||[]).slice(0,30).map(o=>'<li>'+h(o.item_data?.name||'Unnamed item')+'</li>').join('');
    return html('Square catalog preview','<p>Read-only sample (up to 30 items). Nothing has been imported into the Android register.</p>'+
      '<ul>'+(items||'<li>No items in the first page.</li>')+'</ul><p><a href="/oauth/status">Back to dashboard</a></p>');
  }catch{
    return html('Unable to read Square catalog','<p>Ensure the account is authorized and has ITEMS_READ permission.</p><a href="/oauth/status">Back</a>',502);
  }
}
export default async function handler(req){
  const route=new URL(req.url).pathname;
  if(!['/oauth/login','/oauth/start','/oauth/payments-start','/oauth/payments-status','/oauth/callback','/oauth/status','/oauth/locations','/oauth/catalog'].includes(route))
    return html('Not found','',404);
  if(!configured())return html('Connection backend is not configured',
    '<p>This new Netlify site needs its private environment settings and a deployed Functions build. No Square authorization can run yet.</p>',503);
  if(route!=='/oauth/login'&&!authorized(req))return unauth();
  try{
    if(route==='/oauth/login')return login(req);
    if(route==='/oauth/start')return start(req);
    if(route==='/oauth/payments-start')return start(req,true);
    if(route==='/oauth/payments-status')return paymentsStatus();
    if(route==='/oauth/callback')return callback(req,new URL(req.url));
    if(route==='/oauth/status')return status();
    if(route==='/oauth/locations')return locations();
    if(route==='/oauth/catalog')return catalog();
  }catch{return html('Connection error','<p>An unexpected server error occurred. No sensitive details have been shown.</p>',503);}
}
export const config={path:'/oauth/:action'};
