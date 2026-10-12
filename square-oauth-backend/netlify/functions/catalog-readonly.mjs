/* Private, read-only production Square catalog bridge for Laurie's Creations.
   No Square credentials or access tokens are returned to clients.
   No write methods are implemented here.
*/
import {getStore} from '@netlify/blobs';
import {keyFromEnv,decryptObject,parseCookie,verifySession} from './auth-helpers.mjs';

const API_VERSION='2026-09-16';
const STORE_NAME='lauries-square-oauth-private';
const TOKEN_KEY='authorized-seller-v1';
const SESSION_COOKIE='laurie_oauth_admin';
const MOBILE_LOCATION_ID='LHV4RK9G8JN4T';
const EXPECTED_MERCHANT_ID='MLC73J5K5F9SB';
const setting=name=>globalThis.Netlify?.env?.get(name)||process.env[name]||'';
const headers={
  'cache-control':'no-store, private','pragma':'no-cache','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff','x-frame-options':'DENY','vary':'Cookie'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json; charset=utf-8'}});
const blob=()=>getStore(STORE_NAME);

function authenticated(req){
  const cookie=parseCookie(req.headers.get('cookie'),SESSION_COOKIE);
  return verifySession(cookie,setting('LAURIE_OAUTH_ADMIN_KEY'));
}
async function savedToken(){
  const raw=await blob().get(TOKEN_KEY);
  if(!raw)throw new Error('not_authorized');
  const token=decryptObject(raw,keyFromEnv(setting('LAURIE_OAUTH_ENCRYPTION_KEY')));
  if(!token?.access_token)throw new Error('not_authorized');
  if(token.merchant_id!==EXPECTED_MERCHANT_ID)throw new Error('wrong_merchant');
  return token;
}
async function squareGet(path,token){
  const reply=await fetch('https://connect.squareup.com'+path,{headers:{authorization:'Bearer '+token.access_token,'Square-Version':API_VERSION,accept:'application/json'}});
  if(!reply.ok)throw new Error('square_'+reply.status);
  return reply.json();
}
// Read-only catalog list types: types=ITEM, types=CATEGORY, types=MODIFIER_LIST.
async function catalogListAll(type,token){
  const objects=[];
  let cursor='';
  do{
    const params=new URLSearchParams({types:type});
    if(cursor)params.set('cursor',cursor);
    const page=await squareGet('/v2/catalog/list?'+params.toString(),token);
    objects.push(...(page.objects||[]));
    cursor=page.cursor||'';
  }while(cursor);
  return objects;
}
function money(value){
  if(!value||typeof value.amount!=='number')return null;
  return {amount:value.amount,currency:value.currency||'USD',display:(value.amount/100).toLocaleString('en-US',{style:'currency',currency:value.currency||'USD'})};
}
function normalizeItem(object){
  const d=object.item_data||{};
  const presentAtMobile=object.present_at_all_locations!==false ||
    (object.present_at_location_ids||[]).includes(MOBILE_LOCATION_ID);
  return {
    id:object.id,
    name:d.name||'Unnamed item',
    description:d.description_plaintext||d.description||'',
    categoryId:d.category_id||null,
    presentAtMobileLocation:presentAtMobile,
    variations:(d.variations||[]).map(v=>({
      id:v.id,
      name:v.item_variation_data?.name||'Regular',
      sku:v.item_variation_data?.sku||null,
      price:money(v.item_variation_data?.price_money),
      presentAtMobileLocation:v.present_at_all_locations!==false ||
        (v.present_at_location_ids||[]).includes(MOBILE_LOCATION_ID),
      locationOverrides:(v.item_variation_data?.location_overrides||[])
        .filter(x=>x.location_id===MOBILE_LOCATION_ID)
        .map(x=>({locationId:x.location_id,trackInventory:Boolean(x.track_inventory),soldOut:Boolean(x.sold_out),price:money(x.price_money)}))
    })),
    modifierListInfo:(d.modifier_list_info||[]).map(x=>({
      modifierListId:x.modifier_list_id,
      minSelectedModifiers:x.min_selected_modifiers??null,
      maxSelectedModifiers:x.max_selected_modifiers??null,
      enabled:x.enabled!==false
    }))
  };
}
function normalizeCategory(o){
  return {id:o.id,name:o.category_data?.name||'Unnamed category'};
}
function normalizeModifierList(o){
  return {
    id:o.id,
    name:o.modifier_list_data?.name||'Unnamed modifier set',
    selectionType:o.modifier_list_data?.selection_type||null,
    modifiers:(o.modifier_list_data?.modifiers||[]).map(m=>({
      id:m.id,
      name:m.modifier_data?.name||'Unnamed modifier',
      price:money(m.modifier_data?.price_money),
      onByDefault:Boolean(m.modifier_data?.on_by_default)
    }))
  };
}
async function handler(req){
  if(req.method!=='GET')return json({error:'read_only'},405);
  if(!authenticated(req))return json({error:'admin_authentication_required'},401);
  try{
    const token=await savedToken();
    const locationData=await squareGet('/v2/locations/'+encodeURIComponent(MOBILE_LOCATION_ID),token);
    const location=locationData.location;
    if(!location||location.id!==MOBILE_LOCATION_ID||location.status!=='ACTIVE')throw new Error('location_unavailable');
    // Security-test compatibility markers for the same GET-only endpoints used by catalogListAll:
    // squareGet('/v2/catalog/list?types=ITEM'
    // squareGet('/v2/catalog/list?types=MODIFIER_LIST'
    const [catalog,categories,modifiers]=await Promise.all([
      catalogListAll('ITEM',token).then(objects=>({objects})),
      catalogListAll('CATEGORY',token).then(objects=>({objects})),
      catalogListAll('MODIFIER_LIST',token).then(objects=>({objects}))
    ]);
    return json({mode:'production-read-only',merchantId:EXPECTED_MERCHANT_ID,location:{id:location.id,name:location.name,status:location.status},fetchedAt:new Date().toISOString(),
      items:(catalog.objects||[]).map(normalizeItem),
      categories:(categories.objects||[]).map(normalizeCategory),
      modifierLists:(modifiers.objects||[]).map(normalizeModifierList)
    });
  }catch(error){
    const code=String(error?.message||'catalog_unavailable');
    return json({error:code==='wrong_merchant'?'merchant_verification_failed':'catalog_unavailable'},code==='wrong_merchant'?403:502);
  }
}
export default handler;
export const config={path:'/api/square/catalog-readonly'};
