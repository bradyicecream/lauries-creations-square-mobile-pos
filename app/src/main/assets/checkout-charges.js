/* Laurie’s Creations card-only Gratuity and no-tax register calculation.
   Gratuity is a mandatory charge only for Sandbox card payments, never for cash.
   It is not a voluntary tip and must never be passed to Square tipMoney.
   A separate service charge continues to apply to both cash and card payments.
   Charges are local checkout data, not Square Order service-charge objects.
*/
(function(root){
 'use strict';
 const safe=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
 const defaults={
   gratuity:{enabled:false,label:'Gratuity',kind:'percent',value:18},
   service:{enabled:false,label:'Service charge',kind:'percent',value:3}
 };
 function normalize(state){
   // Tax collection has been disabled throughout the v1.8 checkout flow.
   // Clear legacy/imported local tax rates, but do not change historical sale records.
   state.taxPercent=0;
   if(!state.chargeSettings||typeof state.chargeSettings!=='object')state.chargeSettings={};
   for(const key of ['gratuity','service']){
     const old=state.chargeSettings[key]||{};
     const d=defaults[key];
     state.chargeSettings[key]={
       enabled:old.enabled===true,
       label:key==='gratuity'?'Gratuity':
         (typeof old.label==='string'&&old.label.trim()?old.label.trim().slice(0,70):d.label),
       kind:['percent','fixed'].includes(old.kind)?old.kind:d.kind,
       value:typeof old.value==='number'&&Number.isFinite(old.value)?old.value:d.value
     };
   }
   return state.chargeSettings;
 }
 function validate(rule){
   if(!rule||typeof rule!=='object')return 'Invalid charge settings.';
   if(typeof rule.label!=='string'||!rule.label.trim()||rule.label.trim().length>70)
     return 'Enter a charge label up to 70 characters.';
   if(!['percent','fixed'].includes(rule.kind))return 'Choose percent or fixed amount.';
   if(rule.kind==='percent'){
     if(!Number.isFinite(rule.value)||rule.value<0||rule.value>100||
       Math.abs(rule.value*100-Math.round(rule.value*100))>0.00001)
       return 'Enter a rate between 0% and 100%, with up to two decimal places.';
   }else if(!safe(rule.value)||rule.value>1000000){
     return 'Enter a fixed charge of $0.00 to $10,000.00.';
   }
   return null;
 }
 function saveSettings(state,input){
   const updated={};
   for(const key of ['gratuity','service']){
     const rule=input?.[key];
     const prepared={...rule,label:key==='gratuity'?'Gratuity':rule?.label};
     const error=validate(prepared);
     if(error)return {ok:false,error:key+': '+error};
     updated[key]={
       enabled:prepared.enabled===true,label:prepared.label.trim(),
       kind:prepared.kind,value:prepared.value
     };
   }
   state.chargeSettings=updated;
   state.taxPercent=0;
   return {ok:true};
 }
 function calculate(state,method='cash'){
   const validMethod=method==='cash'||method==='card';
   let invalid=!validMethod;
   let sub=0;
   for(const item of state.cart||[]){
     if(!safe(item.price)||!Number.isInteger(item.qty)||item.qty<1||item.qty>99||
       item.needsReview===true){invalid=true;continue;}
     sub+=item.price*item.qty;
   }
   const settings=normalize(state),charges=[];
   for(const key of ['gratuity','service']){
     const rule=settings[key];
     if(!rule.enabled||(key==='gratuity'&&method!=='card'))continue;
     if(validate(rule))invalid=true;
     const cents=rule.kind==='percent'?Math.round(sub*rule.value/100):rule.value;
     if(!safe(cents))invalid=true;
     charges.push({key,label:key==='gratuity'?'Gratuity':rule.label,
       amountCents:cents,kind:rule.kind,value:rule.value,
       paymentMethod:key==='gratuity'?'card':'both'});
   }
   const gratuity=charges.find(c=>c.key==='gratuity')?.amountCents||0;
   const service=charges.find(c=>c.key==='service')?.amountCents||0;
   const tax=0,total=sub+gratuity+service;
   if(!safe(total))invalid=true;
   return {sub,tax,total,baseTotalCents:total,mandatoryGratuityCents:gratuity,
     serviceChargeCents:service,charges,taxBaseCents:0,method,
     incomplete:invalid,invalid};
 }
 const api={normalize,validate,saveSettings,calculate};
 root.LaurieCheckoutCharges=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
