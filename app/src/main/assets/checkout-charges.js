/* Independent mandatory charges for Laurie’s Creations register.
   Required automatic gratuities are itemized service charges, NOT voluntary tipMoney.
   Settings are saved locally, without Square Orders/ServiceCharges synchronization.
*/
(function(root){
  'use strict';
  const safe=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000;
  const defaults={
    gratuity:{enabled:false,label:'Automatic gratuity',kind:'percent',value:18,taxable:false},
    service:{enabled:false,label:'Service charge',kind:'percent',value:3,taxable:false}
  };
  function normalize(state){
    if(!state.chargeSettings||typeof state.chargeSettings!=='object')state.chargeSettings={};
    for(const key of ['gratuity','service']){
      const candidate=state.chargeSettings[key]||{};
      const d=defaults[key];
      state.chargeSettings[key]={
        enabled:candidate.enabled===true,
        label:typeof candidate.label==='string'&&candidate.label.trim()?
          candidate.label.trim().slice(0,70):d.label,
        kind:['percent','fixed'].includes(candidate.kind)?candidate.kind:d.kind,
        value:typeof candidate.value==='number'&&Number.isFinite(candidate.value)?candidate.value:d.value,
        taxable:candidate.taxable===true
      };
    }
    return state.chargeSettings;
  }
  function validate(input){
    if(!input||typeof input!=='object')return 'Invalid charge settings.';
    if(typeof input.label!=='string'||!input.label.trim()||input.label.trim().length>70)
      return 'Enter a charge label up to 70 characters.';
    if(input.kind!=='percent'&&input.kind!=='fixed')return 'Choose percent or fixed amount.';
    if(input.kind==='percent'){
      if(!Number.isFinite(input.value)||input.value<0||input.value>100||
        Math.abs(input.value*100-Math.round(input.value*100))>0.00001)
        return 'Enter a percentage from 0 to 100, with at most two decimals.';
    }else if(!safe(input.value)||input.value>1_000_000){
      return 'Enter a fixed dollar amount from $0.00 to $10,000.00.';
    }
    return null;
  }
  function saveSettings(state,settings){
    const validated={};
    for(const key of ['gratuity','service']){
      const p=settings?.[key];
      const message=validate(p);if(message)return {ok:false,error:key+': '+message};
      validated[key]={
        enabled:p.enabled===true,label:p.label.trim(),kind:p.kind,value:p.value,taxable:p.taxable===true
      };
    }
    state.chargeSettings=validated;
    return {ok:true};
  }
  function calculate(state){
    const incomplete=(state.cart||[]).some(x=>!safe(x.price)||!Number.isInteger(x.qty)||
      x.qty<1||x.qty>99||x.needsReview===true);
    let sub=0;
    for(const x of state.cart||[]){
      if(!safe(x.price)||!Number.isInteger(x.qty)||x.qty<1||x.qty>99)continue;
      sub+=x.price*x.qty;
    }
    const cfg=normalize(state),charges=[];
    let invalid=false;
    for(const key of ['gratuity','service']){
      const rule=cfg[key];
      if(rule.enabled){
        if(validate(rule))invalid=true;
        const cents=rule.kind==='percent'?Math.round(sub*rule.value/100):rule.value;
        if(!safe(cents))invalid=true;
        charges.push({key,label:rule.label,amountCents:cents,
          taxable:rule.taxable,kind:rule.kind,value:rule.value});
      }
    }
    const gratuity=charges.find(c=>c.key==='gratuity')?.amountCents||0;
    const service=charges.find(c=>c.key==='service')?.amountCents||0;
    const taxBase=sub+charges.filter(c=>c.taxable).reduce((n,c)=>n+c.amountCents,0);
    const percent=Number(state.taxPercent)||0;
    if(!Number.isFinite(percent)||percent<0||percent>30)invalid=true;
    const tax=Math.round(taxBase*percent/100);
    const total=sub+gratuity+service+tax;
    if(!safe(total)||!safe(tax))invalid=true;
    return {sub,tax,total,baseTotalCents:total,mandatoryGratuityCents:gratuity,
      serviceChargeCents:service,charges,taxBaseCents:taxBase,
      incomplete:incomplete||invalid,invalid};
  }
  const api={normalize,validate,saveSettings,calculate};
  root.LaurieCheckoutCharges=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
