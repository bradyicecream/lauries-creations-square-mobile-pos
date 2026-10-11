const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');
const op=fs.readFileSync('app/src/main/assets/operations-ui.js','utf8');
const kotlin=fs.readFileSync('app/src/main/java/com/lauriescreations/mobile/MainActivity.kt','utf8');
for(const id of ['staffTool','inventoryTool','displayTool','loyaltyTool','cashTool','paymentLinksTool','bankingTool','opsActivityList']){
  assert.ok(html.includes('id="'+id+'"'),'Missing tool: '+id);
}
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,'No duplicate static IDs');
assert.ok(html.includes('href="operations.css"'),'Operations CSS loaded');
for(const src of ['operations-model.js','operations-ui.js','app.js'])assert.ok(html.includes('src="'+src+'"'),'Script loaded '+src);
assert.ok(html.indexOf('operations-model.js')<html.indexOf('operations-ui.js'));
assert.ok(html.indexOf('operations-ui.js')<html.indexOf('app.js'));
for(const name of ['staff','inventory','cashDrawer','loyalty','displayPreview','connectionInfo','checkout']){
  assert.ok(op.includes('function '+name+'('),'Missing workflow '+name);
}
assert.ok(op.includes('model.quickCashAmounts'),'Cash suggestions computed dynamically');
assert.ok(op.includes('model.tipAmount'),'Tip selection calculates real money');
assert.ok(op.includes("root.LaurieSquare.takePayment(a.total,state.saleId,note.slice(0,450),selectedTip)"),'Tips passed separately to native Sandbox SDK');
assert.ok(op.includes("model.recordSale(state,'local-cash'"),'Local cash sales recorded independently');
assert.ok(js.includes("operationsApi.recordSale(state,'sandbox-card'"),'Inventory updated on successful Sandbox payment');
assert.ok(js.includes("operationsApi.available"),'Inventory guard during item addition');
assert.ok(kotlin.includes('tipCents: Int'),'Native bridge takes tip cents');
assert.ok(kotlin.includes('builder.tipMoney(Money(tipCents.toLong(), CurrencyCode.USD))'),'SDK tipMoney used');
assert.ok(kotlin.includes('amount = Money(amountCents.toLong(), CurrencyCode.USD)'),'SDK base amount excludes tip');
assert.ok(op.includes('a separate secure backend'),'Second display clearly marked not live');
assert.ok(op.includes('Square Checkout API'),'Payment links clearly gated');
assert.ok(!html.includes('O.P. Gallo'),'Laurie-only branding');
console.log('Operations UI, native tip bridge, local payment safety and Square connection boundaries passed.');
