const assert=require('node:assert/strict');
const billing=require('../app/src/main/assets/checkout-charges.js');
const operations=require('../app/src/main/assets/operations-model.js');
const newSale=()=>({
 products:[{id:'gift',name:'Gift basket',category:'Crafts'}],
 cart:[{productId:'gift',name:'Gift basket',price:10000,qty:1,extras:[],flavors:[],needsReview:false}],
 taxPercent:7,saleId:'LC-001',paidSaleId:null
});
const state=newSale();
const defaults=billing.normalize(state);
assert.equal(defaults.gratuity.enabled,false,'Older registers default mandatory gratuity off');
assert.equal(defaults.service.enabled,false,'Older registers default service charge off');
let amount=billing.calculate(state);
assert.equal(amount.sub,10000);
assert.equal(amount.tax,700);
assert.equal(amount.total,10700);
assert.equal(amount.charges.length,0);
let set=billing.saveSettings(state,{
 gratuity:{enabled:true,label:'Auto gratuity 18%',kind:'percent',value:18,taxable:false},
 service:{enabled:true,label:'Event service fee',kind:'fixed',value:350,taxable:true}
});
assert.equal(set.ok,true);
amount=billing.calculate(state);
assert.equal(amount.sub,10000);
assert.equal(amount.mandatoryGratuityCents,1800);
assert.equal(amount.serviceChargeCents,350);
assert.equal(amount.taxBaseCents,10350,'Tax only applied to taxable fixed service charge');
assert.equal(amount.tax,725,'Tax rounds to nearest cent');
assert.equal(amount.baseTotalCents,12875,'Item subtotal, two fees and tax combined');
assert.equal(amount.charges[0].label,'Auto gratuity 18%');
assert.equal(amount.charges[1].label,'Event service fee');
assert.equal(operations.tipAmount(amount.sub,'percentage',15),1500,'Optional tip only based on original item subtotal');
const saved=JSON.parse(JSON.stringify(state));billing.normalize(saved);
assert.deepEqual(saved.chargeSettings,state.chargeSettings,'Mandatory fee rules survive a register backup');
const session=operations.openCash(state,5000);assert.equal(session.ok,true);
const cash=operations.recordSale(state,'local-cash',1500,15000);
assert.equal(cash.ok,true);
assert.equal(cash.row.baseTotalCents,12875);
assert.equal(cash.row.totalCents,14375,'Required charges plus optional gratuity collected');
assert.equal(cash.row.changeCents,625);
assert.equal(cash.row.tipCents,1500);
assert.equal(cash.row.mandatoryGratuityCents,1800,'Required auto-gratuity is NOT a voluntary tip');
assert.equal(cash.row.serviceChargeCents,350);
assert.equal(cash.row.taxCents,725);
assert.equal(cash.row.requiredCharges.length,2);
assert.equal(operations.expectedCash(state,session.row.id),19375,'Entire cash amount deposited including fees and voluntary tip');
assert.equal(operations.recordSale(state,'local-cash',1500,15000).ok,false,'No duplicate sale allowed');
state.saleId='LC-002';state.paidSaleId=null;
assert.equal(operations.recordSale(state,'sandbox-card',1500,null,'test-payment',12875).ok,true,'Sandbox record matches base amount');
state.saleId='LC-003';state.paidSaleId=null;
assert.equal(operations.recordSale(state,'sandbox-card',1500,null,'test-2',10700).ok,false,'Rejects mismatched pending payment amount');
assert.equal(state.paidSaleId,null,'Mismatch does not silently mark a sale as recorded');
const failcases=[
 {enabled:true,label:' ',kind:'percent',value:15,taxable:false},
 {enabled:true,label:'Service',kind:'percent',value:110,taxable:false},
 {enabled:true,label:'Service',kind:'percent',value:12.345,taxable:false},
 {enabled:true,label:'Service',kind:'fixed',value:-1,taxable:false},
 {enabled:true,label:'Service',kind:'fixed',value:123.1,taxable:false}
];
for(const bad of failcases)assert.ok(billing.validate(bad),'Invalid charge rate must be rejected');
assert.equal(billing.validate({enabled:true,label:'Required fee',kind:'percent',value:15.25,taxable:false}),null);
const unverified=newSale();
unverified.cart[0].needsReview=true;
billing.normalize(unverified);
assert.equal(billing.calculate(unverified).incomplete,true,'Unverified items block checkout');
console.log('Required gratuity + service charge: rounding, taxable fees, cash, tips, Square base validation, legacy migration passed.');
