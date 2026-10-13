/* Production Square pairing: admin-approved, short-lived, one-time native authorization.
   Only the Android app's native HTTPS client receives a narrowly scoped access token.
   The browser never receives production credentials. */
import {getStore} from '@netlify/blobs';
import {createHash,randomBytes} from 'node:crypto';
import {decryptObject,encryptObject,keyFromEnv,parseCookie,verifySession} from './auth-helpers.mjs';

const STORE='lauries-square-oauth-private',TOKEN='authorized-payments-v1';
const LOCATION='LHV4RK9G8JN4T',API_VERSION='2026-09-16';
const REQUIRED=['MERCHANT_PROFILE_READ','PAYMENTS_WRITE','PAYMENTS_WRITE_IN_PERSON'];
const setting=name=>globalThis.Netlify?.env?.get(name)||process.env[name]||'';
const key=()=>keyFromEnv(setting('LAURIE_OAUTH_ENCRYPTION_KEY'));
const blobs=()=>getStore(STORE);
const headers={'cache-control':'no-store, private','pragma':'no-cache','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff','x-frame-options':'DENY','vary':'Cookie'};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{...headers,'content-type':'application/json; charset=utf-8'}});
const html=(content,status=200)=>new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Laurie’s Creations secure pairing</title></head><body style="font-family:system-ui;background:#f8f3fa;padding:24px;max-width:640px;margin:auto;color:#34203e"><h1>Laurie’s Creations</h1>'+content+'</body></html>',{status,headers:{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
const digest=code=>createHash('sha256').update(code).digest('hex');
function admin(req){return verifySession(parseCookie(req.headers.get('cookie'),'laurie_admin_session'),setting('LAURIE_OAUTH_ADMIN_KEY'));}
function ready(record){return !!(record&&record.access_token&&
  setting('SQUARE_EXPECTED_MERCHANT_ID')&&record.merchant_id===setting('SQUARE_EXPECTED_MERCHANT_ID')&&
  REQUIRED.every(x=>record.scopes?.includes(x)));}
async function getToken(){const data=await blobs().get(TOKEN);return data?decryptObject(data,key()):null;}
async function validatedToken(){
  const saved=await getToken();if(!ready(saved))throw Error('payment_authorization_required');
  let token=saved;
  if(Date.parse(saved.expires_at||'')<Date.now()+5*60_000){
    if(!saved.refresh_token)throw Error('authorization_expired');
    const response=await fetch('https://connect.squareup.com/oauth2/token',{method:'POST',headers:{
      'content-type':'application/json','Square-Version':API_VERSION},body:JSON.stringify({
        client_id:setting('SQUARE_APPLICATION_ID'),client_secret:setting('SQUARE_APPLICATION_SECRET'),
        grant_type:'refresh_token',refresh_token:saved.refresh_token})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.access_token||!data.refresh_token||data.merchant_id!==saved.merchant_id)
      throw Error('authorization_refresh_failed');
    token={...saved,...data,scopes:saved.scopes,merchant_id:saved.merchant_id};
    await blobs().set(TOKEN,encryptObject(token,key()));
  }
  const result=await fetch('https://connect.squareup.com/oauth2/token/status',{method:'POST',headers:{
    'Square-Version':API_VERSION,authorization:'Bearer '+token.access_token,
    'content-type':'application/json'},body:'{}'});
  const status=await result.json().catch(()=>({}));
  if(!result.ok||status.merchant_id!==token.merchant_id||status.client_id!==setting('SQUARE_APPLICATION_ID')||
    !REQUIRED.every(scope=>(status.scopes||[]).includes(scope)))
    throw Error('payment_permissions_unverified');
  const locationResponse=await fetch('https://connect.squareup.com/v2/locations/'+LOCATION,{headers:{
    'Square-Version':API_VERSION,authorization:'Bearer '+token.access_token,accept:'application/json'}});
  const location=await locationResponse.json().catch(()=>({}));
  if(!locationResponse.ok||location.location?.id!==LOCATION||location.location.status!=='ACTIVE')
    throw Error('location_not_active');
  return token;
}
export default async function handler(req){
  const route=new URL(req.url).pathname;
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const origin=setting('SQUARE_REDIRECT_URI');
  const configuredOrigin=origin?new URL(origin).origin:'';
  if(!configuredOrigin||!setting('SQUARE_EXPECTED_MERCHANT_ID')||
     !setting('SQUARE_APPLICATION_ID')||!setting('SQUARE_APPLICATION_SECRET')||
     !setting('LAURIE_OAUTH_ENCRYPTION_KEY'))return json({error:'not_configured'},503);
  if(route==='/api/square/production-pair'){
    if(!admin(req))return html('<p>Private administrator sign-in is required.</p>',401);
    if(req.headers.get('origin')!==configuredOrigin)return html('<p>Invalid pairing request origin.</p>',403);
    try{
      const record=await getToken();
      if(!ready(record))return html('<p>Approve production payment permissions first. <a href="/oauth/payments-status">Return to payments status</a>.</p>',403);
      const code=randomBytes(24).toString('base64url'); // 192-bit, never stored in plaintext.
      await blobs().set('production-device-code-'+digest(code),encryptObject({
        expires:Date.now()+5*60_000,merchantId:record.merchant_id},key()));
      return html('<p>Enter this one-time pairing code in the <strong>production Android register</strong>. It expires in five minutes and works once.</p><p style="font-size:17px;overflow-wrap:anywhere;padding:14px;background:white;border:1px solid #bbb">'+code+'</p><p>Never post or send this code to anyone. The app must be signed and registered in the Square Developer Console first.</p><p><a href="/oauth/payments-status">Back</a></p>');
    }catch{return html('<p>Could not create pairing code. Check secure storage and authorization.</p>',503);}
  }
  if(route==='/api/square/production-redeem'){
    try{
      if(Number(req.headers.get('content-length')||0)>512)return json({error:'invalid_pairing_code'},400);
      const body=await req.json();
      const code=String(body?.code||'');
      if(!/^[A-Za-z0-9_-]{32}$/.test(code))return json({error:'invalid_pairing_code'},400);
      const lookup='production-device-code-'+digest(code),store=blobs();
      const payload=await store.get(lookup);
      if(!payload)return json({error:'pairing_code_invalid_or_used'},403);
      const record=decryptObject(payload,key());
      await store.delete(lookup); // Consume before token retrieval.
      if(record.expires<=Date.now()||record.merchantId!==setting('SQUARE_EXPECTED_MERCHANT_ID'))
        return json({error:'pairing_code_expired'},403);
      const token=await validatedToken();
      return json({mode:'production',locationId:LOCATION,accessToken:token.access_token,expiresAt:token.expires_at});
    }catch{return json({error:'pairing_unavailable'},503);}
  }
  return json({error:'not_found'},404);
}
export const config={path:['/api/square/production-pair','/api/square/production-redeem']};
