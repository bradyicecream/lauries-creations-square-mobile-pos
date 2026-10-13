import {secureEqual,signSession} from './auth-helpers.mjs';

const setting=name=>globalThis.Netlify?.env?.get(name)||process.env[name]||'';
const noStore={'cache-control':'no-store, private','pragma':'no-cache','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY'};
const html=(message,status=400)=>new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><p>'+message+'</p>',{status,headers:{...noStore,'content-type':'text/html; charset=utf-8'}});

export default async function handler(req){
  if(req.method!=='POST')return html('Use the private sign-in form.',405);
  const secret=setting('LAURIE_OAUTH_ADMIN_KEY');
  if(!secret)return html('Private sign-in is not configured.',503);
  let form;
  try{form=await req.formData();}catch{return html('Invalid sign-in request.',400);}
  const supplied=String(form.get('admin_key')||'');
  if(!secureEqual(supplied,secret))return html('Sign-in unsuccessful. <a href="/">Try again</a>.',401);
  const session=signSession(secret);
  return new Response(null,{status:303,headers:{...noStore,location:'/oauth/status','set-cookie':'laurie_admin_session='+encodeURIComponent(session)+'; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Lax'}});
}

export const config={path:'/admin-login'};
