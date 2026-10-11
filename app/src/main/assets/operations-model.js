/* Laurie’s Creations v1.6: device-local business operations.
   This is not Square Staff, Labor, Inventory, Loyalty, Cash Drawer, or Banking synchronization.
   Data lives in the register JSON backup, not a payroll or financial backend.
*/
(function(root){
  'use strict';
  const id=()=>('LOC-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9));
  const cash=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
  const clean=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,80);
  function normalize(state){
    if(!state.operations||typeof state.operations!=='object')state.operations={};
    const o=state.operations;
    for(const name of ['staff','timecards','inventoryHistory','cashSessions','cashMovements','salesRecords','customers','loyaltyEvents'])
      if(!Array.isArray(o[name]))o[name]=[];
    if(!o.inventory||typeof o.inventory!=='object'||Array.isArray(o.inventory))o.inventory={};
    if(!Object.prototype.hasOwnProperty.call(o,'activeStaffId'))o.activeStaffId=null;
    if(!Object.prototype.hasOwnProperty.call(o,'selectedCustomerId'))o.selectedCustomerId=null;
    return o;
  }
  function addStaff(s,name){const o=normalize(s);name=clean(name);if(!name)return {ok:false,error:'Enter a staff name.'};
    if(o.staff.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.active!==false))return {ok:false,error:'This staff name already exists.'};
    const row={id:id(),name,active:true};o.staff.push(row);return {ok:true,row};
  }
  function clock(s,staffId,now=Date.now()){
    const o=normalize(s),staff=o.staff.find(x=>x.id===staffId&&x.active!==false);
    if(!staff)return {ok:false,error:'Staff member not found.'};
    const open=o.timecards.find(x=>x.staffId===staffId&&x.end===null);
    if(open){if(now<open.start)return {ok:false,error:'End time cannot precede start time.'};
      open.end=now;
      if(o.activeStaffId===staffId)o.activeStaffId=o.timecards.find(x=>x.end===null)?.staffId||null;
      return {ok:true,type:'out',row:open};
    }
    const row={id:id(),staffId,start:now,end:null};o.timecards.push(row);o.activeStaffId=staffId;
    return {ok:true,type:'in',row};
  }
  function inventoryRecord(s,productId){
    const o=normalize(s);return o.inventory[productId]||{enabled:false,quantity:0,lowAt:0};
  }
  function setInventory(s,productId,enabled,quantity,lowAt=0,note='Manual count'){
    const o=normalize(s);
    if(!s.products.some(x=>x.id===productId))return {ok:false,error:'Item not found.'};
    if(!Number.isInteger(quantity)||quantity<0||quantity>1000000||!Number.isInteger(lowAt)||lowAt<0||lowAt>1000000)
      return {ok:false,error:'Enter valid whole-number stock and low-stock values.'};
    const was=inventoryRecord(s,productId);
    o.inventory[productId]={enabled:Boolean(enabled),quantity,lowAt};
    o.inventoryHistory.push({id:id(),productId,from:was.quantity,to:quantity,at:Date.now(),note:clean(note)});
    return {ok:true};
  }
  function available(s,productId,qty=1){
    const inv=inventoryRecord(s,productId);
    if(!inv.enabled)return true;
    return Number.isInteger(qty)&&qty>=0&&inv.quantity>=qty;
  }
  function quickCashAmounts(cents){
    if(!cash(cents)||cents===0)return [];
    const result=[cents];
    const step=[500,1000,2000,5000,10000];
    for(const unit of step){
      let next=Math.ceil(cents/unit)*unit;
      if(next===cents)next+=unit;
      if(!result.includes(next))result.push(next);
      if(result.length===5)break;
    }
    return result.sort((a,b)=>a-b).slice(0,5);
  }
  function tipAmount(subtotal,mode,value=0){
    if(!cash(subtotal))return null;
    if(mode==='none')return 0;
    if(mode==='percentage'&&Number.isFinite(value)&&value>=0&&value<=100)return Math.round(subtotal*value/100);
    if(mode==='fixed'&&cash(value)&&value<=1000000)return value;
    return null;
  }
  function openCash(s,opening){
    const o=normalize(s);if(!cash(opening))return {ok:false,error:'Enter a valid opening cash amount.'};
    if(o.cashSessions.some(x=>x.closedAt===null))return {ok:false,error:'Close the current cash session first.'};
    const row={id:id(),openedAt:Date.now(),openingCents:opening,closedAt:null,countedCents:null};
    o.cashSessions.push(row);return {ok:true,row};
  }
  function currentCash(s){return normalize(s).cashSessions.find(x=>x.closedAt===null)||null;}
  function expectedCash(s,sessionId){
    const o=normalize(s),session=o.cashSessions.find(x=>x.id===sessionId);
    if(!session)return null;
    const receipts=o.salesRecords.filter(x=>x.method==='local-cash'&&x.sessionId===sessionId)
      .reduce((sum,x)=>sum+x.totalCents,0);
    const adjustments=o.cashMovements.filter(x=>x.sessionId===sessionId)
      .reduce((sum,x)=>sum+x.amountCents,0);
    return session.openingCents+receipts+adjustments;
  }
  function closeCash(s,counted){
    const o=normalize(s),session=currentCash(s);
    if(!session)return {ok:false,error:'Open a cash session first.'};
    if(!cash(counted))return {ok:false,error:'Enter a valid counted cash amount.'};
    const expected=expectedCash(s,session.id),variance=counted-expected;
    session.closedAt=Date.now();session.countedCents=counted;session.expectedCents=expected;session.varianceCents=variance;
    return {ok:true,row:session,expected,variance};
  }
  function adjustCash(s,amount,reason){
    const o=normalize(s),session=currentCash(s);
    if(!session)return {ok:false,error:'Open a cash session first.'};
    if(!Number.isSafeInteger(amount)||Math.abs(amount)>100000000||amount===0)
      return {ok:false,error:'Enter a nonzero positive or negative cash amount.'};
    reason=clean(reason);
    if(!reason)return {ok:false,error:'Enter a reason for the cash adjustment.'};
    const row={id:id(),sessionId:session.id,amountCents:amount,reason,at:Date.now()};
    o.cashMovements.push(row);return {ok:true,row};
  }
  function addCustomer(s,label){
    const o=normalize(s);label=clean(label);if(!label)return {ok:false,error:'Enter an identifier or display name.'};
    if(o.customers.some(x=>x.name.toLowerCase()===label.toLowerCase()))return {ok:false,error:'That customer already exists.'};
    const row={id:id(),name:label,points:0};o.customers.push(row);return {ok:true,row};
  }
  function adjustLoyalty(s,customerId,points,reason='Manual points adjustment'){
    const o=normalize(s),c=o.customers.find(x=>x.id===customerId);
    if(!c)return {ok:false,error:'Customer not found.'};
    if(!Number.isInteger(points)||Math.abs(points)>100000)return {ok:false,error:'Invalid point adjustment.'};
    if(c.points+points<0)return {ok:false,error:'Not enough points.'};
    c.points+=points;
    o.loyaltyEvents.push({id:id(),customerId,points,reason,at:Date.now()});
    return {ok:true,points:c.points};
  }
  function recordSale(s,method,tipCents=0,tenderedCents=null,paymentId='',expectedBaseCents=null){
    const o=normalize(s),billing=root.LaurieCheckoutCharges.calculate(s,method==='sandbox-card'?'card':'cash');
    if(o.salesRecords.some(x=>x.saleId===s.saleId))return {ok:false,error:'This sale has already been recorded.'};
    if(!s.cart.length)return {ok:false,error:'The sale is empty.'};
    let subtotal=0;
    for(const item of s.cart){
      if(!cash(item.price)||!Number.isInteger(item.qty)||item.qty<1||item.qty>99||item.needsReview)
        return {ok:false,error:'Verify all prices before checkout.'};
      subtotal+=item.price*item.qty;
    }
    if(billing.incomplete||billing.sub!==subtotal)return {ok:false,error:'Verify required charge and tax settings before checkout.'};
    const tax=billing.tax,base=billing.baseTotalCents,total=base+tipCents;
    if(!cash(tipCents)||!cash(total))return {ok:false,error:'Invalid sale amount.'};
    if(expectedBaseCents!==null&&base!==expectedBaseCents)
      return {ok:false,error:'Sale total changed during Square Sandbox payment; check payment history before reconciling.'};
    const session=method==='local-cash'?currentCash(s):null;
    if(method==='local-cash'&&!session)return {ok:false,error:'Open a cash drawer session before recording a cash sale.'};
    if(method==='local-cash'&&(!cash(tenderedCents)||tenderedCents<total))return {ok:false,error:'Cash given must cover the total.'};
    if(method!=='local-cash'&&method!=='sandbox-card')return {ok:false,error:'Unsupported payment mode.'};
    const sold=new Map();
    for(const item of s.cart)if(item.productId!=='manual'){
      sold.set(item.productId,(sold.get(item.productId)||0)+item.qty);
    }
    for(const [productId,qty] of sold)if(!available(s,productId,qty))
      return {ok:false,error:'Not enough local stock for '+(s.products.find(x=>x.id===productId)?.name||'item')+'.'};
    const row={
      id:id(),saleId:s.saleId,method,at:Date.now(),items:JSON.parse(JSON.stringify(s.cart)),
      subtotalCents:subtotal,taxCents:tax,tipCents,totalCents:total,
      mandatoryGratuityCents:billing.mandatoryGratuityCents,
      serviceChargeCents:billing.serviceChargeCents,
      requiredCharges:billing.charges.map(x=>({...x})),taxBaseCents:billing.taxBaseCents,
      baseTotalCents:base,
      tenderedCents:method==='local-cash'?tenderedCents:null,
      changeCents:method==='local-cash'?tenderedCents-total:null,
      sessionId:session?.id||null,paymentId:method==='sandbox-card'?paymentId||'':null,
      staffId:o.activeStaffId||null,customerId:o.selectedCustomerId||null
    };
    o.salesRecords.push(row);
    for(const [productId,qty] of sold){
      const item=o.inventory[productId];
      if(item?.enabled){
        const from=item.quantity;item.quantity-=qty;
        o.inventoryHistory.push({id:id(),productId,from,to:item.quantity,at:Date.now(),note:'Completed '+method+' sale '+s.saleId});
      }
    }
    if(o.selectedCustomerId){
      const pts=Math.floor(subtotal/100);
      if(pts>0)adjustLoyalty(s,o.selectedCustomerId,pts,'Locally recorded sale '+s.saleId);
    }
    s.paidSaleId=s.saleId;
    return {ok:true,row};
  }
  const api={normalize,addStaff,clock,inventoryRecord,setInventory,available,quickCashAmounts,tipAmount,
    openCash,currentCash,expectedCash,closeCash,adjustCash,addCustomer,adjustLoyalty,recordSale};
  root.LaurieOperations=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
