/* Local business operations UI for Laurie’s Creations POS v1.6.
   External Square banking/payment links and second-device display require a separate secure backend.
*/
(function(root){
 'use strict';
 function init(state,ui){
   const model=root.LaurieOperations;
   const e=ui.escape,fmt=ui.format,$=ui.$,save=ui.save,render=ui.render;
   const open=ui.openModal,close=ui.closeModal,toast=ui.toast,moneyIn=ui.moneyIn;
   const ops=()=>model.normalize(state);
   const date=ms=>ms?new Date(ms).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
   const memo=()=>{save();render();};
   const formNum=id=>moneyIn($(id)?.value);
   const amt=c=>fmt(c);
   const hours=n=>((n||0)/3600000).toFixed(2)+'h';
   function staff(){
     const o=ops();
     const cards=o.staff.map(person=>{
       const shifts=o.timecards.filter(x=>x.staffId===person.id);
       const openShift=shifts.find(x=>x.end===null);
       const completed=shifts.filter(x=>x.end!==null).reduce((sum,x)=>sum+x.end-x.start,0);
       return '<div class="opsRow"><div class="opsLabel"><strong>'+e(person.name)+'</strong><small>'+
        (openShift?'Clocked in since '+e(date(openShift.start)):'Off shift')+' · '+hours(completed)+' recorded</small></div>'+
        '<button class="secondary" data-clock-staff="'+e(person.id)+'">'+(openShift?'Clock out':'Clock in')+'</button></div>';
     }).join('');
     open('Staff & time cards',
       '<p class="opsWarning">Local time-card log only. Not official Square Team, payroll, or a secure employee login.</p>'+
       '<label class="field">New staff display name<input id="opsStaffName" maxlength="80" placeholder="Enter staff name"></label>'+
       '<button class="secondary" id="opsAddStaff">＋ Add staff member</button><div class="opsDivider"></div>'+
       (cards||'<p class="fine">No staff yet. Add a staff member to start clocking in and out.</p>')+
       '<p class="fine">These time stamps are saved on this device and included in its register backup. Do not use them as verified payroll records.</p>',
       [{label:'Done',click:close}]);
     $('opsAddStaff').onclick=()=>{const r=model.addStaff(state,$('opsStaffName').value);
       if(!r.ok){toast(r.error);return;}memo();staff();};
     $('dialogBody').querySelectorAll('[data-clock-staff]').forEach(btn=>btn.onclick=()=>{
       const r=model.clock(state,btn.dataset.clockStaff);
       if(!r.ok){toast(r.error);return;}memo();staff();toast(r.type==='in'?'Clocked in':'Clocked out');
     });
   }
   function inventory(){
     const o=ops(),products=state.products;
     const lows=products.filter(p=>{const n=model.inventoryRecord(state,p.id);return n.enabled&&n.quantity<=n.lowAt;});
     const rows=lows.slice(0,12).map(p=>'<div class="opsRow"><strong>'+e(p.name)+'</strong><small>Remaining '+e(model.inventoryRecord(state,p.id).quantity)+'</small></div>').join('');
     const options=products.map(p=>'<option value="'+e(p.id)+'">'+e(p.name)+' · '+e(p.category||'Other')+'</option>').join('');
     open('Inventory tracking',
       '<p class="opsWarning">Local product-level stock counts. This is not Square Inventory sync, and variations currently share one product count.</p>'+
       '<div class="opsKpis"><div><strong>'+products.filter(p=>model.inventoryRecord(state,p.id).enabled).length+'</strong><small>Tracked items</small></div><div><strong>'+lows.length+'</strong><small>Low / out of stock</small></div></div>'+
       '<label class="field">Choose product<select id="opsInventoryItem">'+options+'</select></label>'+
       '<label class="opsCheck"><input id="opsInventoryEnabled" type="checkbox"> Track this item’s stock</label>'+
       '<div class="opsFormRow"><label class="field">Quantity on hand<input id="opsStock" type="number" min="0" step="1" inputmode="numeric"></label>'+
       '<label class="field">Low-stock alert at<input id="opsStockLow" type="number" min="0" step="1" inputmode="numeric"></label></div>'+
       '<button id="opsSaveInventory" class="primary" type="button">Save inventory count</button>'+
       '<div class="opsDivider"></div><strong>Low-stock items</strong>'+(rows||'<p class="fine">No tracked products currently show low stock.</p>'),
       [{label:'Done',click:close}]);
     const load=()=>{const n=model.inventoryRecord(state,$('opsInventoryItem').value);
       $('opsInventoryEnabled').checked=n.enabled;
       $('opsStock').value=n.quantity;
       $('opsStockLow').value=n.lowAt;};
     $('opsInventoryItem').onchange=load;load();
     $('opsSaveInventory').onclick=()=>{
       const r=model.setInventory(state,$('opsInventoryItem').value,$('opsInventoryEnabled').checked,
         Number($('opsStock').value),Number($('opsStockLow').value));
       if(!r.ok){toast(r.error);return;}memo();inventory();toast('Inventory saved');
     };
   }
   function cashDrawer(){
     const o=ops(),active=model.currentCash(state);
     const recent=o.cashSessions.slice(-6).reverse().map(x=>{
       const expected=model.expectedCash(state,x.id);
       const closed=x.closedAt!==null;
       return '<div class="opsRow"><div class="opsLabel"><strong>'+e(date(x.openedAt))+'</strong><small>'+
         (closed?'Closed '+e(date(x.closedAt)):'Open now')+' · Expected '+amt(expected)+
         (closed?' · Variance '+amt(Math.abs(x.varianceCents||0))+(x.varianceCents<0?' short':' over'):'')+
         '</small></div></div>';
     }).join('');
     const body=active?
       '<div class="opsKpis"><div><strong>'+amt(model.expectedCash(state,active.id))+'</strong><small>Expected cash in drawer</small></div><div><strong>'+e(o.salesRecords.filter(x=>x.sessionId===active.id).length)+'</strong><small>Local cash sales</small></div></div>'+
       '<h3 class="opsMiniHeading">Paid in / paid out</h3>'+
       '<label class="field">Adjustment amount ($)<input id="opsCashAdjust" type="text" inputmode="decimal" placeholder="5.00"></label>'+
       '<label class="field">Reason<input id="opsCashReason" maxlength="80" placeholder="e.g. Buy supplies"></label>'+
       '<div class="opsFormRow"><button class="secondary" id="opsPaidIn" type="button">＋ Paid in</button><button class="secondary" id="opsPaidOut" type="button">− Paid out</button></div>'+
       '<div class="opsDivider"></div>'+
       '<label class="field">Counted closing cash ($)<input id="opsCounted" type="text" inputmode="decimal" placeholder="0.00"></label>'+
       '<button class="secondary" id="opsCloseCash" type="button">Close cash session</button>'
       :'<label class="field">Opening cash / starting bank ($)<input id="opsOpening" type="text" value="0.00" inputmode="decimal"></label>'+
       '<button class="primary" id="opsOpenCash" type="button">Open cash session</button>';
     open('Cash management',
       '<p class="opsWarning">Local cash ledger only. No physical cash drawer is connected and no cash totals are posted to Square or a bank.</p>'+
       body+'<div class="opsDivider"></div><strong>Recent cash sessions</strong>'+recent,
       [{label:'Done',click:close}]);
     if(active){
       for(const [field,sign] of [['opsPaidIn',1],['opsPaidOut',-1]]){
         $(field).onclick=()=>{
           const amount=formNum('opsCashAdjust');
           if(amount===null||Number.isNaN(amount)||amount<=0){toast('Enter a positive adjustment amount.');return;}
           const r=model.adjustCash(state,amount*sign,$('opsCashReason').value);
           if(!r.ok){toast(r.error);return;}
           memo();cashDrawer();toast(sign>0?'Paid in recorded':'Paid out recorded');
         };
       }
     }
     if(active)$('opsCloseCash').onclick=()=>{const counted=formNum('opsCounted'),r=model.closeCash(state,counted);
       if(!r.ok){toast(r.error);return;}memo();cashDrawer();toast('Cash counted; variance '+(r.variance<0?'-':'+')+amt(Math.abs(r.variance)));};
     else $('opsOpenCash').onclick=()=>{const amount=formNum('opsOpening'),r=model.openCash(state,amount);
       if(!r.ok){toast(r.error);return;}memo();cashDrawer();toast('Cash session opened');};
   }
   function loyalty(){
     const o=ops();
     const rows=o.customers.map(c=>'<div class="opsRow"><div class="opsLabel"><strong>'+e(c.name)+'</strong><small>'+e(c.points)+' local points</small></div>'+
       '<button class="secondary" data-select-loyal="'+e(c.id)+'">'+(o.selectedCustomerId===c.id?'Selected':'Select')+'</button>'+
       '<button class="secondary" data-adjust-loyal="'+e(c.id)+'">±</button></div>').join('');
     open('Loyalty — local test',
       '<p class="opsWarning">Not connected to Square Loyalty or Square Customers. Do not enter sensitive customer details; this prototype stores labels and points locally without account security.</p>'+
       '<p class="fine">Earn 1 point per whole dollar of product subtotal on completed locally recorded cash or Sandbox card tests.</p>'+
       '<label class="field">Customer nickname or test identifier<input id="opsCustomerLabel" maxlength="80" placeholder="Example: Customer A"></label>'+
       '<button class="secondary" id="opsAddLoyal" type="button">＋ Add customer</button>'+
       '<button class="secondary" id="opsUnselectLoyal" type="button">No customer on this sale</button>'+
       '<div class="opsDivider"></div>'+(rows||'<p class="fine">No customers added yet.</p>'),
       [{label:'Done',click:close}]);
     $('opsAddLoyal').onclick=()=>{const r=model.addCustomer(state,$('opsCustomerLabel').value);
       if(!r.ok){toast(r.error);return;}o.selectedCustomerId=r.row.id;memo();loyalty();};
     $('opsUnselectLoyal').onclick=()=>{o.selectedCustomerId=null;memo();loyalty();};
     $('dialogBody').querySelectorAll('[data-select-loyal]').forEach(btn=>btn.onclick=()=>{
       o.selectedCustomerId=btn.dataset.selectLoyal;memo();loyalty();
     });
     $('dialogBody').querySelectorAll('[data-adjust-loyal]').forEach(btn=>btn.onclick=()=>{
       const c=o.customers.find(x=>x.id===btn.dataset.adjustLoyal);
       if(!c)return;
       open('Adjust '+c.name+' points',
         '<p class="opsWarning">Local test points only; does not redeem Square rewards or discount the cart.</p>'+
         '<label class="field">Points to add or subtract<input id="opsPointsDelta" type="number" step="1" inputmode="numeric" value="1"></label>',[
         {label:'Back',click:loyalty},
         {label:'Save adjustment',kind:'primary',click:()=>{
           const r=model.adjustLoyalty(state,c.id,Number($('opsPointsDelta').value));
           if(!r.ok){toast(r.error);return;}memo();loyalty();toast('Points updated');
         }}
       ]);
     });
   }
   function displayPreview(){
     const totals=ui.amounts();
     const lines=state.cart.map(x=>'<div class="customerDisplayLine"><span>'+e(x.qty)+' × '+e(x.name)+'</span><strong>'+amt(x.price*x.qty)+'</strong></div>').join('');
     open('Customer-facing display preview',
       '<p class="opsWarning">Preview on this device only. A synchronized second iPad or Zebra display will require a hosted, authenticated connection; this preview does not transmit sales to another screen.</p>'+
       '<div class="customerDisplayDemo"><div class="customerDisplayBrand">✦ Laurie’s Creations</div>'+
       '<p>Welcome! Your order</p>'+(lines||'<div class="customerDisplayEmpty">Items will appear here as you build the sale.</div>')+
       '<div class="customerDisplayTotal"><span>Total</span><strong>'+amt(totals.total)+'</strong></div>'+
       '<small>Handmade with love and a little bit of sparkle</small></div>',[
       {label:'Close preview',click:close}
     ]);
   }
   function connectionInfo(type){
     const isLinks=type==='links',title=isLinks?'Payment links':'Banking';
     open(title+' — connection needed',
       '<p class="opsWarning">'+(isLinks?
         'Square-hosted Payment Links need the Square Checkout API and a secure server-side token. This version does not create, email or charge a payment link.':
         'Bank balances, transfers and payouts are only available through Square’s authenticated Dashboard or a supported secure integration. This app does not view or move banking funds.')+'</p>'+
       '<p>Use your official Square Dashboard to manage '+(isLinks?'payment links':'banking and payouts')+
       '. Do not enter financial account credentials or Square access tokens into this register.</p>',[
       {label:'Close',click:close},
       {label:'Open Square Dashboard',kind:'primary',click:()=>{
         if(root.LaurieSquare?.openSquareDashboard){root.LaurieSquare.openSquareDashboard();return;}
         alert('On your Zebra, open https://squareup.com/dashboard in your regular browser and sign in securely.');
       }}
     ]);
   }
   function recentActivity(){
     const o=ops();
     return o.salesRecords.slice(-20).reverse().map(x=>
       '<div class="opsRow"><div class="opsLabel"><strong>'+e(x.method==='local-cash'?'Local cash':'Square Sandbox test')+
       ' · '+amt(x.totalCents)+'</strong><small>'+e(date(x.at))+
       (x.tipCents?' · Tip '+amt(x.tipCents):'')+
       (x.method==='local-cash'?' · Local only':' · Sandbox only')+'</small></div></div>').join('');
   }
   function cashPayment(sub,tip,amount){
     const received=amount;
     const result=model.recordSale(state,'local-cash',tip,received);
     if(!result.ok){toast(result.error);return;}
     memo();close();toast('Local cash sale recorded; change '+amt(result.row.changeCents));
     alert('LOCAL CASH SALE RECORDED\nNot synced to Square or a bank.\n\nSale total: '+amt(result.row.totalCents)+
       '\nCash received: '+amt(received)+'\nChange due: '+amt(result.row.changeCents)+
       '\n\nOpen Cash management to review your cash session.');
   }
   function checkout(){
     const a=ui.amounts(),o=ops();
     if(!state.cart.length||a.incomplete||a.total<=0||state.paidSaleId===state.saleId){toast('Review cart and prices first.');return;}
     const stock=state.cart.filter(x=>x.productId!=='manual').reduce((m,x)=>{
       m[x.productId]=(m[x.productId]||0)+x.qty;return m;
     },{});
     const exhausted=Object.entries(stock).find(([id,qty])=>!model.available(state,id,qty));
     if(exhausted){toast('Not enough local stock: '+(state.products.find(x=>x.id===exhausted[0])?.name||'item'));return;}
     let selectedTip=0;
     let tendered=a.total;
     const tipButtons=[0,10,15,20,25].map(percent=>
       '<button type="button" class="tipChoice'+(percent===0?' active':'')+'" data-tip-percent="'+percent+'">'+(percent===0?'No tip':percent+'%')+'</button>').join('');
     open('Checkout · Sandbox / cash',
       '<p class="opsWarning">Square card payments use the Sandbox mock reader. Cash sales are stored only on this device.</p>'+
       '<div class="checkoutSummary"><div><span>Order + tax</span><strong>'+amt(a.total)+'</strong></div>'+
       '<div><span>Selected tip</span><strong id="opsTipAmount">'+amt(0)+'</strong></div>'+
       '<div class="checkoutGrand"><span>Total due</span><strong id="opsTotalDue">'+amt(a.total)+'</strong></div></div>'+
       '<h3 class="opsMiniHeading">Add a tip</h3><div class="tipChoices" id="opsTipChoices">'+tipButtons+'</div>'+
       '<label class="field">Or custom tip ($)<input id="opsCustomTip" type="text" inputmode="decimal" placeholder="0.00"></label>'+
       '<div class="opsDivider"></div><h3 class="opsMiniHeading">Cash received — quick amounts</h3>'+
       '<div id="opsQuickCash" class="opsQuickCash"></div>'+
       '<label class="field">Cash given ($)<input id="opsCashGiven" type="text" inputmode="decimal" value="'+(a.total/100).toFixed(2)+'"></label>'+
       '<p class="opsChange">Change due: <strong id="opsCashChange">$0.00</strong></p>'+
       '<p class="fine">A cash session must be open to record local cash sales. Sandbox card payments are simulated tests only.</p>',[
       {label:'Cancel',click:close},
       {label:'Record cash (local)',click:()=>{
         const value=formNum('opsCashGiven');
         const total=a.total+selectedTip;
         if(value===null||Number.isNaN(value)||value<total){toast('Enter cash received at least equal to total due.');return;}
         if(!model.currentCash(state)){toast('Open a cash session under More → Cash Management first.');return;}
         cashPayment(a.sub,selectedTip,value);
       }},
       {label:'Square Sandbox card',kind:'primary',click:()=>{
         if(!root.LaurieSquare?.takePayment||ui.squareState()!=='authorized-sandbox'){
           toast('Connect Square Sandbox before test card checkout.');return;
         }
         const note=state.cart.map(x=>x.qty+'× '+x.name+(x.variant?' / '+x.variant:'')).join('; ')
           +(state.saleNote?' | '+state.saleNote:'');
         state.pendingSquare={saleId:state.saleId,tipCents:selectedTip,startedAt:Date.now()};
         save();close();
         // SDK payment amount excludes tip; Square receives it as a separate tipMoney value.
         root.LaurieSquare.takePayment(a.total,state.saleId,note.slice(0,450),selectedTip);
       }}
     ]);
     const updateTotals=()=>{
       const total=a.total+selectedTip;
       $('opsTipAmount').textContent=amt(selectedTip);$('opsTotalDue').textContent=amt(total);
       const choices=model.quickCashAmounts(total);
       $('opsQuickCash').innerHTML=choices.map(v=>'<button class="secondary" type="button" data-cash-value="'+v+'">'+
         (v===total?'Exact '+amt(v):amt(v))+'</button>').join('');
       tendered=total;$('opsCashGiven').value=(total/100).toFixed(2);
       $('opsCashChange').textContent=amt(0);
     };
     $('dialogBody').querySelectorAll('[data-tip-percent]').forEach(btn=>btn.onclick=()=>{
       const value=Number(btn.dataset.tipPercent);
       selectedTip=model.tipAmount(a.sub,'percentage',value);
       $('opsCustomTip').value='';
       $('dialogBody').querySelectorAll('[data-tip-percent]').forEach(x=>x.classList.toggle('active',x===btn));
       updateTotals();
     });
     $('opsCustomTip').oninput=()=>{
       const value=formNum('opsCustomTip');
       if(value===null)selectedTip=0;
       else if(Number.isNaN(value)||value>1000000)return;
       else selectedTip=model.tipAmount(a.sub,'fixed',value);
       $('dialogBody').querySelectorAll('[data-tip-percent]').forEach(x=>x.classList.remove('active'));
       updateTotals();
     };
     $('opsQuickCash').onclick=ev=>{
       const b=ev.target.closest('[data-cash-value]');if(!b)return;
       tendered=Number(b.dataset.cashValue);$('opsCashGiven').value=(tendered/100).toFixed(2);
       $('opsCashChange').textContent=amt(tendered-(a.total+selectedTip));
     };
     $('opsCashGiven').oninput=()=>{
       const n=formNum('opsCashGiven');
       $('opsCashChange').textContent=n!==null&&!Number.isNaN(n)&&n>=a.total+selectedTip?
         amt(n-(a.total+selectedTip)):'—';
     };
     updateTotals();
   }
   return {staff,inventory,cashDrawer,loyalty,displayPreview,connectionInfo,recentActivity,checkout};
 }
 root.LaurieOperationsUI={init};
})(typeof window!=='undefined'?window:globalThis);
