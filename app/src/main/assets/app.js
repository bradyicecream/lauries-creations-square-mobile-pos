/* Laurie’s Creations POS — offline register UI + Android-only Square Sandbox checkout.
   Register state stays in this WebView's localStorage; no automatic Square catalog sync.
*/
(() => {
  'use strict';
  const KEY='laurie-square-mobile-v1';
  const defaultState=()=>({
    products:[
      {id:'tumbler',name:'Tumbler',category:'Tumblers',icon:'🥤',price:2500,variants:['Black OSU','White OSU','Black OU','White OU'],scoops:0,extras:[]},
      {id:'autism',name:'Autism awareness',category:'Crafts',icon:'💜',price:100,variants:[],scoops:0,extras:[]},
      {id:'halloween',name:'Halloween bracelet',category:'Beads',icon:'🎃',price:300,variants:[],scoops:0,extras:[]},
      {id:'ice1',name:'Ice cream — 1 scoop',category:'Ice Cream',icon:'🍦',price:null,variants:[],scoops:1,extras:[]},
      {id:'ice2',name:'Ice cream — 2 scoops',category:'Ice Cream',icon:'🍨',price:null,variants:[],scoops:2,extras:[]}
    ],
    flavors:[{id:'vanilla',name:'Vanilla',price:0,active:true},{id:'chocolate',name:'Chocolate',price:0,active:true},{id:'strawberry',name:'Strawberry',price:0,active:true}],
    taxPercent:0,cart:[],saleId:makeId(),paidSaleId:null
  });
  function makeId(){return 'LC'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,7).toUpperCase();}
  let state;
  try {state=JSON.parse(localStorage.getItem(KEY))||defaultState();}catch(_){state=defaultState();}
  if(!Array.isArray(state.products)||!Array.isArray(state.cart)||!Array.isArray(state.flavors))state=defaultState();
  const $=id=>document.getElementById(id);
  const format=cents=>cents===null||!Number.isSafeInteger(cents)?'PRICE NEEDED':(cents/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const e=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const moneyIn=val=>{const s=String(val??'').trim();if(s==='')return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))return NaN;const n=Math.round(Number(s)*100);return Number.isSafeInteger(n)&&n<=100000000?n:NaN;};
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}
  function toast(msg){const t=$('toast');t.textContent=msg;t.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display='none',3800);}
  let category='All';
  let modalSave=()=>{};
  function openModal(title,body,buttons){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;$('dialogActions').innerHTML='';for(const b of buttons){const bt=document.createElement('button');bt.type='button';bt.className=b.kind||'secondary';bt.textContent=b.label;bt.addEventListener('click',b.click);$('dialogActions').appendChild(bt);}if(!$('dialog').open)$('dialog').showModal();}
  function closeModal(){$('dialog').close();}
  $('closeDialog').addEventListener('click',closeModal);
  $('dialogForm').addEventListener('submit',ev=>ev.preventDefault());
  function catalog(){const cats=['All',...new Set(state.products.map(x=>x.category||'Other'))];if(!cats.includes(category))category='All';$('categories').innerHTML=cats.map(x=>`<button class="chip ${x===category?'active':''}" data-cat="${e(x)}">${e(x)}</button>`).join('');$('productGrid').innerHTML=state.products.filter(p=>category==='All'||p.category===category).map(p=>`<button class="product" data-product="${e(p.id)}"><span class="emoji">${e(p.icon||'🧵')}</span><span class="name">${e(p.name)}</span><span class="${p.price===null?'unverified':'price'}">${format(p.price)}${p.scoops?' · '+p.scoops+' scoop'+(p.scoops>1?'s':''):''}</span></button>`).join('');}
  function lineTotal(item){if(item.price===null||!Number.isSafeInteger(item.price))return null;return item.price*(item.qty||1);}
  function amounts(){const incomplete=state.cart.some(x=>lineTotal(x)===null);const sub=state.cart.reduce((sum,x)=>sum+(lineTotal(x)||0),0);const percent=Number(state.taxPercent)||0;const tax=Math.round(sub*percent/100);return {sub,tax,total:sub+tax,incomplete};}
  function renderCart(){const a=amounts();$('cartList').innerHTML=state.cart.length?state.cart.map((x,i)=>`<div class="cartitem"><div class="itemText"><strong>${e(x.qty)}× ${e(x.name)}</strong><small>${[x.variant||'',...(x.flavors||[]).map(id=>state.flavors.find(f=>f.id===id)?.name||'Removed flavor'),...(x.extras||[]).map(t=>t.name)].filter(Boolean).map(e).join(' · ')}</small></div><span class="itemprice">${format(lineTotal(x))}</span><button class="mini" data-edit-cart="${i}">Edit</button></div>`).join(''):'<p class="empty">Tap a product to start a sale.</p>';
    $('subtotal').textContent=format(a.sub);$('tax').textContent=format(a.tax);$('total').textContent=format(a.total);$('taxCaption').textContent=`(${Number(state.taxPercent)||0}%)`;
    const paid=state.paidSaleId===state.saleId;$('checkout').disabled=!state.cart.length||a.incomplete||paid;$('checkout').textContent=paid?'Sale completed — clear to start next':a.incomplete?'Set missing prices before payment':'Pay with Square — TEST ONLY';$('checkoutNotice').textContent=paid?'Sandbox payment reported success; do not charge this sale again.':a.incomplete?'One or more products need a verified price. Tap Manage → Products.':'Tax is set manually. Verify tax, modifiers, total, and Square location before checkout.';save();}
  function render(){catalog();renderCart();syncSquareStatus();}
  function productById(id){return state.products.find(p=>p.id===id);}
  function addOrEditItem(productId,index=null){const p=productById(productId);if(!p)return;const current=index===null?null:state.cart[index];let chosenVariant=current?.variant||p.variants?.[0]||'';let choices=current?.flavors?.slice()||Array(p.scoops||0).fill('').map(()=>state.flavors.find(f=>f.active)?.id||'');let extras=(current?.extras||[]).map(x=>x.name);
    const variations=(p.variants||[]).length?`<label class="field">Variation<select id="choiceVariant">${p.variants.map(v=>`<option value="${e(v)}" ${v===chosenVariant?'selected':''}>${e(v)}</option>`).join('')}</select></label>`:'';
    const flavorRows=Array.from({length:p.scoops||0},(_,j)=>`<label class="field">Scoop ${j+1}<select class="flavorSelect" data-scoop="${j}">${state.flavors.filter(f=>f.active||choices[j]===f.id).map(f=>`<option value="${e(f.id)}" ${choices[j]===f.id?'selected':''}>${e(f.name)}${f.price?' (+'+format(f.price)+')':''}${!f.active?' (unavailable)':''}</option>`).join('')}</select></label>`).join('');
    const extraRows=(p.extras||[]).length?`<div class="divider"></div><strong>Modifiers</strong>${p.extras.map((x,j)=>`<label class="field"><input type="checkbox" data-extra="${j}" ${extras.includes(x.name)?'checked':''}> ${e(x.name)} (+${format(x.price)})</label>`).join('')}`:'';
    openModal(index===null?'Add '+p.name:'Edit cart item',variations+flavorRows+extraRows+`<label class="field">Quantity<input id="quantity" type="number" inputmode="numeric" min="1" max="99" value="${current?.qty||1}"></label><p class="fine">Base price: ${format(p.price)}. Changes to base prices happen in Manage → Products.</p>`,[
      ...(index!==null?[{label:'Remove item',click:()=>{state.cart.splice(index,1);save();closeModal();render();}}]:[]),
      {label:'Cancel',click:closeModal},
      {label:index===null?'Add to cart':'Save changes',kind:'primary',click:()=>{
          const qty=Number($('quantity').value);if(!Number.isInteger(qty)||qty<1||qty>99){toast('Quantity must be 1–99');return;}
          const selectedFlavors=[...$('dialogBody').querySelectorAll('.flavorSelect')].map(el=>el.value);
          if(selectedFlavors.some(id=>!state.flavors.find(f=>f.id===id)?.active)){toast('Choose an available flavor');return;}
          const selectedExtras=[...$('dialogBody').querySelectorAll('[data-extra]:checked')].map(el=>p.extras[Number(el.dataset.extra)]);
          const plus=selectedFlavors.reduce((sum,id)=>sum+(state.flavors.find(f=>f.id===id)?.price||0),0)+selectedExtras.reduce((s,x)=>s+x.price,0);
          const price=p.price===null?null:p.price+plus;
          const item={key:makeId(),productId:p.id,name:p.name,variant:$('choiceVariant')?.value||'',flavors:selectedFlavors,extras:selectedExtras,price,qty};
          if(index===null)state.cart.push(item);else state.cart[index]=item;
          state.paidSaleId=null;save();closeModal();render();toast(index===null?'Added to cart':'Item updated');
      }}
    ]);
    if(p.scoops&&!state.flavors.some(f=>f.active))toast('No available flavors. Add flavors in Manage.');
  }
  function editProduct(id=null){const p=id?productById(id):null;openModal(p?'Edit product':'New product',`
    <label class="field">Product name<input id="productName" maxlength="100" value="${e(p?.name||'')}"></label>
    <label class="field">Category<input id="productCategory" maxlength="35" value="${e(p?.category||'Crafts')}"></label>
    <label class="field">Product icon or emoji<input id="productIcon" maxlength="10" value="${e(p?.icon||'🧵')}"></label>
    <label class="field">Base price in dollars (leave blank if unverified)<input id="productPrice" type="text" inputmode="decimal" value="${p?.price===null||p===null?'':(p.price/100).toFixed(2)}"></label>
    <label class="field">Variations (one per line)<textarea id="productVariants" rows="4" style="width:100%">${e((p?.variants||[]).join('\n'))}</textarea></label>
    <label class="field">Number of ice cream scoops (0–6)<input id="productScoops" type="number" min="0" max="6" value="${p?.scoops||0}"></label>
    <label class="field">Modifiers (one per line: name|upcharge in dollars)<textarea id="productExtras" rows="4" style="width:100%" placeholder="Gift wrap|1.00">${e((p?.extras||[]).map(x=>x.name+'|'+(x.price/100).toFixed(2)).join('\n'))}</textarea></label>
    <p class="fine">Only prices you enter are used for new cart items. Existing cart items keep their previous price until edited.</p>`,[
      ...(p?[{label:'Delete product',click:()=>{if(!confirm('Delete product from catalog? Items already in cart remain.'))return;state.products=state.products.filter(x=>x.id!==p.id);closeModal();render();}}]:[]),
      {label:'Cancel',click:closeModal},
      {label:'Save product',kind:'primary',click:()=>{
        const name=$('productName').value.trim(),cat=$('productCategory').value.trim(),price=moneyIn($('productPrice').value),scoops=Number($('productScoops').value);
        if(!name||!cat||Number.isNaN(price)||!Number.isInteger(scoops)||scoops<0||scoops>6){toast('Check product name, price and scoops');return;}
        const variants=$('productVariants').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,30);
        const extras=[];for(const line of $('productExtras').value.split('\n').map(x=>x.trim()).filter(Boolean)){
          const pieces=line.split('|');const name=pieces[0]?.trim();const amount=moneyIn(pieces[1]);if(!name||amount===null||Number.isNaN(amount)){toast('Invalid modifier. Use name|1.00');return;}extras.push({name,price:amount});
        }
        const value={id:p?.id||makeId(),name,category:cat,icon:$('productIcon').value.trim()||'🧵',price,variants,scoops,extras};
        if(p)state.products=state.products.map(x=>x.id===id?value:x);else state.products.push(value);
        save();closeModal();render();toast('Product saved');
      }}
    ]);
  }
  function flavorsEditor(){openModal('Ice cream flavors',`<p class="fine">Rename flavors, set an optional per-scoop upcharge, and mark unavailable flavors off. Editing a cart item lets you change its scoops.</p><div id="flavorEditor">${state.flavors.map((f,i)=>`<div class="flavorRow"><input aria-label="Flavor name" data-flavor-name="${i}" value="${e(f.name)}"><input aria-label="Upcharge dollars" data-flavor-price="${i}" value="${(f.price/100).toFixed(2)}"><label><input type="checkbox" data-flavor-active="${i}" ${f.active?'checked':''}> On</label></div>`).join('')}</div><button type="button" class="secondary" id="addFlavor">+ Flavor</button>`,[
    {label:'Cancel',click:closeModal},{label:'Save flavors',kind:'primary',click:()=>{
      const result=[];const editor=$('flavorEditor');const names=[...editor.querySelectorAll('[data-flavor-name]')];for(const input of names){const i=Number(input.dataset.flavorName),name=input.value.trim(),price=moneyIn(editor.querySelector(`[data-flavor-price="${i}"]`).value);if(!name)continue;if(price===null||Number.isNaN(price)){toast('Check flavor prices');return;}const active=editor.querySelector(`[data-flavor-active="${i}"]`).checked;result.push({id:state.flavors[i]?.id||makeId(),name,price,active});}state.flavors=result;save();closeModal();render();toast('Flavors saved');
    }}
  ]);$('addFlavor').onclick=()=>{const i=$('flavorEditor').querySelectorAll('[data-flavor-name]').length;$('flavorEditor').insertAdjacentHTML('beforeend',`<div class="flavorRow"><input data-flavor-name="${i}" placeholder="New flavor"><input data-flavor-price="${i}" value="0.00"><label><input data-flavor-active="${i}" type="checkbox" checked> On</label></div>`);};}
  function manage(){openModal('Manage register',`<p>Update products, prices, flavors and tax. Your changes stay on this device only.</p><p class="fine">Pricing imported from an older register is NOT automatic. Verify against the Square catalog before accepting any payment.</p><label class="field">Manual sales tax rate (%)<input id="taxRate" type="number" min="0" max="30" step="0.01" value="${e(state.taxPercent)}"></label><div class="divider"></div><div style="display:flex;gap:7px;flex-wrap:wrap" id="manageProducts">${state.products.map(p=>`<button class="mini" type="button" data-manage-product="${e(p.id)}">${e(p.name)} · ${format(p.price)}</button>`).join('')}</div>`,[
      {label:'Export backup',click:()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='lauries-register-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Backup exported');}},
      {label:'Import backup',click:()=>{$('importFile').click();}},
      {label:'Flavors',click:flavorsEditor},
      {label:'New product',click:()=>editProduct()},
      {label:'Save tax',kind:'primary',click:()=>{const rate=Number($('taxRate').value);if(!Number.isFinite(rate)||rate<0||rate>30){toast('Enter a tax rate from 0–30%');return;}state.taxPercent=rate;save();closeModal();render();toast('Tax updated');}}
    ]);
  }
  $('importFile').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;try{const src=JSON.parse(await file.text());if(!Array.isArray(src.products)||!Array.isArray(src.flavors)||!Array.isArray(src.cart))throw Error('Invalid backup');if(!confirm('Replace your current register settings and cart with this backup?'))return;state=src;state.saleId=makeId();state.paidSaleId=null;save();closeModal();render();toast('Backup restored — verify prices');}catch(_){toast('Could not import this backup');}finally{ev.target.value='';}});
  function squareState(){try{return window.LaurieSquare?.squareState?.()||'browser-preview';}catch(_){return 'unavailable';}}
  function syncSquareStatus(){const v=squareState(),text={'not-configured':'Add Sandbox app ID','unauthorized-sandbox':'Sandbox not connected','authorized-sandbox':'Sandbox connected','browser-preview':'Browser preview only','unavailable':'Square unavailable'};$('sqStatus').textContent=text[v]||v;}
  window.receiveSquareEvent=function(payload){let msg;try{msg=JSON.parse(payload);}catch(_){return;}
    if(msg.type==='success'){state.paidSaleId=state.saleId;save();renderCart();toast('Square SANDBOX approved a test payment.');alert('TEST PAYMENT APPROVED (not a real charge).\nPayment ID: '+(msg.paymentId||'Check Sandbox Dashboard')+'\n\nCart is kept for review. Use Clear to begin a new sale.');}
    else {toast(msg.message||msg.type);if(msg.type==='authorized')syncSquareStatus();}
  };
  $('categories').addEventListener('click',ev=>{const b=ev.target.closest('[data-cat]');if(b){category=b.dataset.cat;catalog();}});
  $('productGrid').addEventListener('click',ev=>{const b=ev.target.closest('[data-product]');if(b)addOrEditItem(b.dataset.product);});
  $('cartList').addEventListener('click',ev=>{const b=ev.target.closest('[data-edit-cart]');if(b){const i=Number(b.dataset.editCart);addOrEditItem(state.cart[i].productId,i);}});
  $('dialogBody').addEventListener('click',ev=>{const b=ev.target.closest('[data-manage-product]');if(b)editProduct(b.dataset.manageProduct);});
  $('newProduct').onclick=()=>editProduct();$('settingsButton').onclick=manage;
  $('clearCart').onclick=()=>{if(state.cart.length&&!confirm('Clear the entire current sale? Check payment status in Square first if you attempted checkout.'))return;state.cart=[];state.saleId=makeId();state.paidSaleId=null;render();};
  $('squareConnect').onclick=()=>{if(window.LaurieSquare?.configureSquare)window.LaurieSquare.configureSquare();else toast('Install Android APK to connect Square Sandbox');};
  $('readerSettings').onclick=()=>{if(window.LaurieSquare?.readerSettings)window.LaurieSquare.readerSettings();else toast('Reader settings are available in the Android APK');};
  $('checkout').onclick=()=>{const a=amounts();if(!state.cart.length||a.incomplete||a.total<=0||state.paidSaleId===state.saleId){toast('Review cart and prices first');return;}if(!window.LaurieSquare?.takePayment){toast('Payment SDK works only inside the installed Android APK');return;}
    if(squareState()!=='authorized-sandbox'){toast('Connect Square Sandbox first');return;}
    const note=state.cart.map(x=>`${x.qty}x ${x.name}${x.variant?' / '+x.variant:''}${x.flavors?.length?' / '+x.flavors.map(id=>state.flavors.find(f=>f.id===id)?.name||'Unknown').join('+'):''}`).join('; ').slice(0,450);
    const ok=confirm('SQUARE SANDBOX TEST (no real charge)\n\nSubtotal: '+format(a.sub)+'\nManual tax: '+format(a.tax)+' ('+state.taxPercent+'%)\nTOTAL: '+format(a.total)+'\n\nConfirm all prices, modifiers, tax and location are correct. Proceed to Square?');if(!ok)return;
    window.LaurieSquare.takePayment(a.total,state.saleId,note);
  };
  render();document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSquareStatus();});
})();
