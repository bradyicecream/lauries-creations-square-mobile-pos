const assert=require('node:assert/strict');
const charges=require('../app/src/main/assets/checkout-charges.js');
const ops=require('../app/src/main/assets/operations-model.js');
const newSale=()=>({
 products:[{id:'gift',name:'Gift basket',category:'Crafts'}],
 cart:[{productId:'gift',name:'Gift basket',price:10000,qty:1,needsReview:false,extras:[],flavors:[]}],
 taxPercent:7,saleId:'LC-001',paidSaleId:null
});
const s=newSale();
let settings=charges.normalize(s);
assert.equal(s.taxPercent,0,'Old tax rates migrated to zero');
assert.equal(settings.gratuity.label,'Gratuity','Name exactly Gratuity');
assert.equal(settings.gratuity.enabled,false,'Previously off remains off');
assert.equal(settings.service.enabled,false,'Previously off remains off');
let cash=charges.calculate(s,'cash'),card=charges.calculate(s,'card');
assert.equal(cash.tax,0);assert.equal(card.tax,0);
assert.equal(cash.total,10000);assert.equal(card.total,10000);
const saved=charges.saveSettings(s,{
 gratuity:{enabled:true,label:'Automatic gratuity',kind:'percent',value:18,taxable:true},
 service:{enabled:true,label:'Packaging charge',kind:'fixed',value:350,taxable:true}
});
assert.equal(saved.ok,true);
assert.equal(s.chargeSettings.gratuity.label,'Gratuity','Gratuity label fixed regardless of previous names');
assert.ok(!Object.hasOwn(s.chargeSettings.service,'taxable'),'Tax flags removed');
cash=charges.calculate(s,'cash');card=charges.calculate(s,'card');
assert.equal(cash.sub,10000);
assert.equal(cash.serviceChargeCents,350);
assert.equal(cash.mandatoryGratuityCents,0,'Cash never includes required Gratuity');
assert.equal(cash.total,10350);
assert.deepEqual(cash.charges.map(x=>x.label),['Packaging charge']);
assert.equal(card.serviceChargeCents,350);
assert.equal(card.mandatoryGratuityCents,1800,'Card includes required Gratuity');
assert.equal(card.total,12150,'Card and cash prices differ by Gratuity');
assert.deepEqual(card.charges.map(x=>x.label),['Gratuity','Packaging charge']);
assert.equal(card.charges[0].paymentMethod,'card');
assert.equal(card.tax,0,'No tax on card payment');
assert.equal(cash.tax,0,'No tax on cash payment');
assert.equal(s.taxPercent,0,'Tax remains zero');
const backup=JSON.parse(JSON.stringify(s));
charges.normalize(backup);
assert.equal(backup.taxPercent,0);
assert.deepEqual(backup.chargeSettings,s.chargeSettings,'Settings persist in register JSON');
const session=ops.openCash(s,2000);assert.ok(session.ok);
const paidCash=ops.recordSale(s,'local-cash',0,11000);
assert.equal(paidCash.ok,true);
assert.equal(paidCash.row.baseTotalCents,10350);
assert.equal(paidCash.row.totalCents,10350);
assert.equal(paidCash.row.mandatoryGratuityCents,0,'Cash sales record no Gratuity');
assert.equal(paidCash.row.serviceChargeCents,350);
assert.equal(paidCash.row.taxCents,0);
assert.equal(paidCash.row.changeCents,650);
assert.equal(ops.expectedCash(s,session.row.id),12350);
assert.equal(ops.recordSale(s,'local-cash',0,11000).ok,false,'Avoid duplicate cash sales');
s.saleId='LC-002';s.paidSaleId=null;
const paidCard=ops.recordSale(s,'sandbox-card',1500,null,'test-card',12150);
assert.equal(paidCard.ok,true,'SDK expected base matches card fee total');
assert.equal(paidCard.row.taxCents,0);
assert.equal(paidCard.row.mandatoryGratuityCents,1800);
assert.equal(paidCard.row.serviceChargeCents,350);
assert.equal(paidCard.row.tipCents,1500,'Voluntary tip separate from mandatory Gratuity');
assert.equal(paidCard.row.totalCents,13650);
assert.equal(ops.expectedCash(s,session.row.id),12350,'Card sales do not affect drawer totals');
s.saleId='LC-003';s.paidSaleId=null;
assert.equal(ops.recordSale(s,'sandbox-card',0,null,'test-bad',10350).ok,false,
  'Reject Sandbox callback using cash instead of card amount');
assert.equal(s.paidSaleId,null);
s.chargeSettings.gratuity.kind='fixed';s.chargeSettings.gratuity.value=199;
assert.equal(charges.calculate(s,'cash').mandatoryGratuityCents,0,'Fixed Gratuity also excludes cash');
assert.equal(charges.calculate(s,'card').mandatoryGratuityCents,199,'Fixed Gratuity applies to card');
const legacy=newSale();
legacy.chargeSettings={gratuity:{enabled:true,label:'Automatic gratuity',kind:'percent',value:18,taxable:true},
 service:{enabled:true,label:'Service charge',kind:'percent',value:3,taxable:true}};
charges.normalize(legacy);
assert.equal(legacy.taxPercent,0);
assert.equal(legacy.chargeSettings.gratuity.label,'Gratuity');
assert.ok(!Object.hasOwn(legacy.chargeSettings.gratuity,'taxable'));
assert.equal(charges.calculate(legacy,'cash').total,10300,'Cash includes service only');
assert.equal(charges.calculate(legacy,'card').total,12100,'Card includes service and Gratuity');
assert.equal(charges.calculate(legacy,'card').tax,0);
assert.equal(charges.calculate(legacy,'invalid').incomplete,true,'Invalid tender types rejected');
assert.ok(charges.validate({label:'x',kind:'percent',value:110}));
assert.ok(charges.validate({label:'x',kind:'fixed',value:-1}));
const unknown=newSale();unknown.cart[0].needsReview=true;
assert.equal(charges.calculate(unknown,'cash').incomplete,true,'Price review blocks payment');
console.log('Card-only Gratuity, separate service fee, zero tax, cash/card sale records, backups and SDK base checks passed.');
