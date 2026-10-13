/* Local business operations UI. Customer display pairs over local Wi-Fi on Android;
   external banking and payment links still require their own secure backends.
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
     let details={};
     try{details=JSON.parse(root.LaurieSquare?.displayStatus?.()||'{}');}catch(_){}
     const available=details.running===true && details.address && details.pairingCode;
     const totals=ui.amounts(),cardTotals=root.LaurieCheckoutCharges.calculate(state,'card');
     const lines=state.cart.map(x=>'<div class="customerDisplayLine"><span>'+e(x.qty)+' × '+e(x.name)+'</span><strong>'+amt(x.price*x.qty)+'</strong></div>').join('');
     const demo='<div class="customerDisplayDemo"><div class="customerDisplayBrand">✦ Laurie’s Creations</div>'+
       '<p>Welcome! Your order</p>'+(lines||'<div class="customerDisplayEmpty">Items will appear here as you build the sale.</div>')+
       '<div class="customerDisplayCharges">'+totals.charges.map(c=>
         '<div class="customerDisplayLine"><span>'+e(c.label)+' (required)</span><strong>'+amt(c.amountCents)+'</strong></div>').join('')+
         (cardTotals.mandatoryGratuityCents?
           '<div class="customerDisplayLine"><span>Gratuity (card only)</span><strong>'+amt(cardTotals.mandatoryGratuityCents)+'</strong></div>':'')+
         '</div><div class="customerDisplayTotal"><span>Cash total</span><strong>'+amt(totals.total)+'</strong></div>'+
         (cardTotals.mandatoryGratuityCents?
           '<div class="customerDisplayTotal"><span>Card total</span><strong>'+amt(cardTotals.total)+'</strong></div>':'')+
         '<small>Handmade with love and a little bit of sparkle</small></div>';
     if(available){
       open('Live customer-facing display',
         '<p class="opsWarning">LIVE over local Wi-Fi. Keep this Zebra register open and connect both devices to the same Wi-Fi network. The second screen is view-only, and no Square credentials or card data are shared.</p>'+
         '<p><strong>1. On the customer iPad or Zebra, open Safari or Chrome and enter:</strong></p>'+
         '<p style="font-size:1.14em;word-break:break-all;background:#f4e9fa;padding:12px;border-radius:9px;color:#442356"><strong>'+e(details.address)+'</strong></p>'+
         '<p><strong>2. Enter this pairing code:</strong></p>'+
         '<p style="font-size:1.45em;letter-spacing:.16em;font-weight:900;text-align:center;color:#57306f">'+e(details.pairingCode)+'</p>'+
         '<p><strong>3.</strong> Add, edit or remove an item on this register. The customer screen updates automatically (usually within one second).</p>'+
         '<button type="button" class="secondary" id="opsShareDisplay">Share address and code</button>'+
         '<p class="fine">This is a local-network connection, not an internet-hosted Square customer display. The cashier device and Wi-Fi must stay available.</p>'+
         '<p class="fine">Current order example on cashier:</p>'+demo,[
           {label:'Close',click:close}
         ]);
       const button=$('opsShareDisplay');
       if(button)button.onclick=()=>{try{root.LaurieSquare.shareDisplayDetails();}catch(_){toast('Could not share the display link.');}};
     }else{
       open('Customer-facing display preview',
         '<p class="opsWarning">'+e(details.reason||'Live pairing is available inside the updated Android APK, not a browser-only preview.')+
         ' This on-device example is not synchronized with another screen.</p>'+demo,[
           {label:'Close preview',click:close}
         ]);
     }
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
       '<div class="opsRow"><div class="opsLabel"><strong>'+e(x.method==='local-cash'?'Local cash':x.method==='production-card'?'Square production':'Square Sandbox test')+
       ' · '+amt(x.totalCents)+'</strong><small>'+e(date(x.at))+
       (x.mandatoryGratuityCents?' · Required gratuity '+amt(x.mandatoryGratuityCents):'')+
       (x.serviceChargeCents?' · Service charge '+amt(x.serviceChargeCents):'')+
       (x.tipCents?' · Voluntary tip '+amt(x.tipCents):'')+
       (x.method==='local-cash'?' · Local only':x.method==='production-card'?' · Real Square payment':' · Sandbox only')+'</small></div></div>').join('');
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
     const production=root.LaurieSquare?.environment?.()==='production';
     const paymentLabel=production?'Square PRODUCTION card':'Square Sandbox card';
     if(state.pendingSquare){toast('Wait for the Square payment result.');return;}
     const cash=ui.amounts(),card=root.LaurieCheckoutCharges.calculate(state,'card');
     if(!state.cart.length||cash.incomplete||card.incomplete||cash.total<=0||state.paidSaleId===state.saleId){
       toast('Review cart and prices first.');return;
     }
     const stock=state.cart.filter(x=>x.productId!=='manual').reduce((m,x)=>{
       m[x.productId]=(m[x.productId]||0)+x.qty;return m;
     },{});
     const exhausted=Object.entries(stock).find(([id,qty])=>!model.available(state,id,qty));
     if(exhausted){toast('Not enough local stock: '+(state.products.find(x=>x.id===exhausted[0])?.name||'item'));return;}
     let selectedTip=0;
     const tipButtons=[0,10,15,20,25].map(percent=>
       '<button type="button" class="tipChoice'+(percent===0?' active':'')+'" data-tip-percent="'+percent+'">'+(percent===0?'No tip':percent+'%')+'</button>').join('');
     open(production?'Checkout · Cash or REAL card':'Checkout · Cash or Sandbox card',
       '<p class="opsWarning"><strong>Taxes are not calculated.</strong> Required Gratuity applies to card payments only; cash payments never include it. The separate Service charge, if enabled, applies to both.</p>'+
       '<div class="checkoutSummary"><div><span>Items</span><strong>'+amt(cash.sub)+'</strong></div>'+
       cash.charges.map(c=>'<div><span>'+e(c.label)+' (required, cash & card)</span><strong>'+amt(c.amountCents)+'</strong></div>').join('')+
       (card.mandatoryGratuityCents>0?
         '<div class="cardGratuitySummary"><span>Gratuity (required, card only)</span><strong>'+amt(card.mandatoryGratuityCents)+'</strong></div>':'')+
       '<div><span>Optional tip</span><strong id="opsTipAmount">'+amt(0)+'</strong></div>'+
       '<div class="checkoutGrand"><span>Cash total</span><strong id="opsTotalDue">'+amt(cash.total)+'</strong></div>'+
       '<div class="checkoutGrand cardTotalRow"><span>Card total</span><strong id="opsCardTotal">'+amt(card.total)+'</strong></div></div>'+
       '<h3 class="opsMiniHeading">Optional additional tip</h3>'+
       (card.mandatoryGratuityCents>0?
         '<p class="fine">Gratuity is already included in the card total. No additional voluntary tip is required.</p>':'')+
       '<div class="tipChoices" id="opsTipChoices">'+tipButtons+'</div>'+
       '<label class="field">Or custom tip ($)<input id="opsCustomTip" type="text" inputmode="decimal" placeholder="0.00"></label>'+
       '<div class="opsDivider"></div><h3 class="opsMiniHeading">Cash received — automatic quick amounts</h3>'+
       '<div id="opsQuickCash" class="opsQuickCash"></div>'+
       '<label class="field">Cash given ($)<input id="opsCashGiven" type="text" inputmode="decimal" value="'+(cash.total/100).toFixed(2)+'"></label>'+
       '<p class="opsChange">Change due: <strong id="opsCashChange">$0.00</strong></p>'+
       '<p class="fine">Cash sales save locally and need an open cash session. Card payments are '+(production?'REAL charges':'Sandbox tests only')+'. A card-only mandatory charge can be subject to card surcharge restrictions even if called Gratuity.</p>',[
       {label:'Cancel',click:close},
       {label:'Record cash (local)',click:()=>{
         const value=formNum('opsCashGiven'),total=cash.total+selectedTip;
         if(value===null||Number.isNaN(value)||value<total){
           toast('Cash received must cover the cash total.');return;
         }
         if(!model.currentCash(state)){
           toast('Open a cash session in More → Cash management first.');return;
         }
         cashPayment(cash.sub,selectedTip,value);
       }},
       {label:paymentLabel,kind:'primary',click:()=>{
         if(!root.LaurieSquare?.takePayment||ui.squareState()!==(production?'authorized-production':'authorized-sandbox')){
           toast('Authorize '+paymentLabel+' first.');return;
         }
         if(production && !confirm('REAL CARD CHARGE. This will charge a customer '+amt(card.total+selectedTip)+'. Verify Square location and the reader before continuing.'))return;
         const note=state.cart.map(x=>x.qty+'× '+x.name+(x.variant?' / '+x.variant:'')).join('; ')+
           (card.charges.length?' | Charges: '+card.charges.map(c=>c.label+' '+amt(c.amountCents)).join(', '):'')+
           (state.saleNote?' | '+state.saleNote:'');
         state.pendingSquare={saleId:state.saleId,baseCents:card.baseTotalCents,
           tipCents:selectedTip,startedAt:Date.now()};
         save();close();
         // Only voluntary tip is sent as tipMoney; mandatory Gratuity belongs in base amount.
         root.LaurieSquare.takePayment(card.total,state.saleId,note.slice(0,450),selectedTip);
       }}
     ]);
     const updateTotals=()=>{
       const cashDue=cash.total+selectedTip,cardDue=card.total+selectedTip;
       $('opsTipAmount').textContent=amt(selectedTip);
       $('opsTotalDue').textContent=amt(cashDue);
       $('opsCardTotal').textContent=amt(cardDue);
       const choices=model.quickCashAmounts(cashDue);
       $('opsQuickCash').innerHTML=choices.map(value=>
         '<button class="secondary" type="button" data-cash-value="'+value+'">'+
         (value===cashDue?'Exact '+amt(value):amt(value))+'</button>').join('');
       $('opsCashGiven').value=(cashDue/100).toFixed(2);
       $('opsCashChange').textContent=amt(0);
     };
     $('dialogBody').querySelectorAll('[data-tip-percent]').forEach(btn=>btn.onclick=()=>{
       selectedTip=model.tipAmount(cash.sub,'percentage',Number(btn.dataset.tipPercent));
       $('opsCustomTip').value='';
       $('dialogBody').querySelectorAll('[data-tip-percent]').forEach(x=>x.classList.toggle('active',x===btn));
       updateTotals();
     });
     $('opsCustomTip').oninput=()=>{
       const value=formNum('opsCustomTip');
       if(value===null)selectedTip=0;
       else if(Number.isNaN(value)||value>1000000)return;
       else selectedTip=model.tipAmount(cash.sub,'fixed',value);
       $('dialogBody').querySelectorAll('[data-tip-percent]').forEach(x=>x.classList.remove('active'));
       updateTotals();
     };
     $('opsQuickCash').onclick=event=>{
       const button=event.target.closest('[data-cash-value]');if(!button)return;
       const tendered=Number(button.dataset.cashValue);
       $('opsCashGiven').value=(tendered/100).toFixed(2);
       $('opsCashChange').textContent=amt(tendered-(cash.total+selectedTip));
     };
     $('opsCashGiven').oninput=()=>{
       const tendered=formNum('opsCashGiven');
       $('opsCashChange').textContent=tendered!==null&&!Number.isNaN(tendered)&&tendered>=cash.total+selectedTip?
         amt(tendered-(cash.total+selectedTip)):'—';
     };
     updateTotals();
   }
   return {staff,inventory,cashDrawer,loyalty,displayPreview,connectionInfo,recentActivity,checkout};
 }
 root.LaurieOperationsUI={init};
})(typeof window!=='undefined'?window:globalThis);
