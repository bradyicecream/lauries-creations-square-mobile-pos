/* Laurie’s Creations POS — offline register UI + Android-only Square Sandbox checkout.
   Register state stays in this WebView's localStorage; no automatic Square catalog sync.
*/
(() => {
  'use strict';
  const KEY='laurie-square-mobile-v1';
  // Saved v4.4 register snapshot; local changes always take precedence on existing installs.
  const savedCatalog=window.LaurieLegacyCatalog||{products:[],flavors:[]};
  const fallbackProducts=[
    {id:'tumbler',name:'Tumbler',category:'Tumblers',icon:'🥤',price:2500,variants:['Black OSU','White OSU','Black OU','White OU'],scoops:0,extras:[]},
    {id:'autism',name:'Autism awareness',category:'Crafts',icon:'💜',price:100,variants:[],scoops:0,extras:[]},
    {id:'halloween',name:'Halloween bracelet',category:'Beads',icon:'🎃',price:300,variants:[],scoops:0,extras:[]}
  ];
  const defaultState=()=>{
    const products=Array.isArray(savedCatalog.products)&&savedCatalog.products.length?savedCatalog.products.map(p=>({...p})):fallbackProducts.slice();
    for(const p of fallbackProducts)if(!products.some(x=>x.name.toLowerCase()===p.name.toLowerCase()))products.push(p);
    const flavors=Array.isArray(savedCatalog.flavors)&&savedCatalog.flavors.length?savedCatalog.flavors.map(f=>({...f})):[
      {id:'vanilla',name:'Vanilla',price:0,active:true},
      {id:'chocolate',name:'Chocolate',price:0,active:true},
      {id:'strawberry',name:'Strawberry',price:0,active:true}
    ];
    return {products,flavors,taxPercent:0,cart:[],saleId:makeId(),saleNote:'',paidSaleId:null,favorites:products.slice(0,8).map(p=>p.id),savedCatalogVersion:savedCatalog.version||null};
  };
  function makeId(){return 'LC'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,7).toUpperCase();}
  let state;
  try {state=JSON.parse(localStorage.getItem(KEY))||defaultState();}catch(_){state=defaultState();}
  if(!Array.isArray(state.products)||!Array.isArray(state.cart)||!Array.isArray(state.flavors))state=defaultState();
  const groupsApi=window.LaurieFavoriteGroups;
  groupsApi.normalize(state); // Migrates older single Favorites lists without deleting them.
  const modifiersApi=window.LaurieModifierGroups;
  const cartApi=window.LaurieRegisterCart;
  modifiersApi.normalize(state); // Preserves and migrates saved per-product modifier groups.
  const operationsApi=window.LaurieOperations;
  operationsApi.normalize(state); // Device-local operations data.
  const $=id=>document.getElementById(id);
  const format=cents=>cents===null||!Number.isSafeInteger(cents)?'PRICE NEEDED':(cents/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const e=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const moneyIn=val=>{const s=String(val??'').trim();if(s==='')return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))return NaN;const n=Math.round(Number(s)*100);return Number.isSafeInteger(n)&&n<=100000000?n:NaN;};
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}
  let operationsUI;
  function initOperationsUI(){
    operationsUI=window.LaurieOperationsUI.init(state,{
      escape:e,format,$,save,render,openModal,closeModal,toast,moneyIn,amounts,squareState
    });
  }
  function toast(msg){const t=$('toast');t.textContent=msg;t.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display='none',3800);}
  let category='All';
  let registerTab='favorites';
  let activeNav='checkout';
  let searchText='';
  let amountDigits='';
  // Every Favorites group has its own independent, ordered item list.
  let modalSave=()=>{};
  function openModal(title,body,buttons){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;$('dialogActions').innerHTML='';for(const b of buttons){const bt=document.createElement('button');bt.type='button';bt.className=b.kind||'secondary';bt.textContent=b.label;bt.addEventListener('click',b.click);$('dialogActions').appendChild(bt);}if(!$('dialog').open)$('dialog').showModal();}
  function closeModal(){$('dialog').close();}
  $('closeDialog').addEventListener('click',closeModal);
  $('dialogForm').addEventListener('submit',ev=>ev.preventDefault());
  function catalog(){
    // If a utility view is hidden while active, return safely to Favorites.
    if((registerTab==='keypad'&&!groupsApi.isUtilityTabVisible(state,'keypad'))||
       (registerTab==='library'&&!groupsApi.isUtilityTabVisible(state,'library'))){
      registerTab='favorites';
    }
    const currentGroup=groupsApi.active(state);
    const tabBar=$('registerTabs');
    const previousScroll=tabBar.scrollLeft;
    const names=state.favoriteGroups.map(g=>{
      const selected=registerTab==='favorites'&&currentGroup.id===g.id;
      return `<button type="button" data-group-id="${e(g.id)}" class="${selected?'active':''}" aria-selected="${selected}" title="${e(g.name)}">★ ${e(g.name)}</button>`;
    }).join('');
    tabBar.innerHTML=names+
      `<button type="button" class="newGroupTab" data-create-favorite-group="true" title="Create new Favorites tab">＋ Tab</button>`+
      (groupsApi.isUtilityTabVisible(state,'keypad')
        ?`<button type="button" data-register-tab="keypad" class="${registerTab==='keypad'?'active':''}" aria-selected="${registerTab==='keypad'}">▤ Keypad</button>`:'')+
      (groupsApi.isUtilityTabVisible(state,'library')
        ?`<button type="button" data-register-tab="library" class="${registerTab==='library'?'active':''}" aria-selected="${registerTab==='library'}">☰ Library</button>`:'');
    tabBar.scrollLeft=previousScroll;
    const selectedGroupName=currentGroup.name;
    $('favoritesToolbar').hidden=registerTab!=='favorites';
    $('currentFavoriteName').textContent=selectedGroupName;
    $('libraryFavoritesTarget').hidden=registerTab!=='library';
    $('libraryFavoriteGroupName').textContent='★ Adding to: '+selectedGroupName;
    const tabHint=registerTab==='favorites'
      ?'Tap an item to add it to the sale. Edit Items changes this tab, not your Square catalog.'
      :registerTab==='keypad'?'Enter a custom dollar amount.'
      :'Browse all your items. ★ adds an item to the selected Favorites tab.';
    $('catalogHint').textContent=tabHint;
    $('searchWrap').hidden=registerTab==='keypad';
    $('itemSearch').placeholder=registerTab==='favorites'?'Search '+currentGroup.name:'Search the item library';
    $('categories').hidden=registerTab!=='library';
    $('productGrid').hidden=registerTab==='keypad';
    $('keypadPanel').hidden=registerTab!=='keypad';
    const cats=['All',...new Set(state.products.map(x=>x.category||'Other'))];
    if(!cats.includes(category))category='All';
    $('categories').innerHTML=cats.map(x=>`<button class="chip ${x===category?'active':''}" data-cat="${e(x)}">${e(x)}</button>`).join('');
    let products=[];
    if(registerTab==='favorites'){
      const q=searchText.toLowerCase().trim();
      products=currentGroup.productIds.map(id=>state.products.find(p=>p.id===id)).filter(Boolean)
        .filter(p=>!q||[p.name,p.category,...(p.variants||[])].join(' ').toLowerCase().includes(q));
    }else if(registerTab==='library'){
      const q=searchText.toLowerCase().trim();
      products=state.products.filter(p=>(category==='All'||p.category===category)
        &&(!q||[p.name,p.category,...(p.variants||[])].join(' ').toLowerCase().includes(q)));
    }
    $('productGrid').setAttribute('aria-label',registerTab==='favorites'?currentGroup.name+' favorites':'Item library');
    $('productGrid').innerHTML=products.length?products.map(p=>`
      <div class="productTile">
        <button class="product" type="button" data-product="${e(p.id)}" aria-label="Add ${e(p.name)}">
          <span class="emoji" aria-hidden="true">${e(p.icon||'🧵')}</span>
          <span class="tileInfo"><span class="name">${e(p.name)}</span><span class="tileMeta">${e(p.category||'Item')}</span></span>
          <span class="${p.price===null?'unverified':'price'}">${format(p.price)}${p.scoops?' · '+p.scoops+' scoop'+(p.scoops>1?'s':''):''}</span>
        </button>
        ${registerTab==='library'?`<button type="button" class="favoriteToggle ${currentGroup.productIds.includes(p.id)?'active':''}" data-favorite="${e(p.id)}" aria-label="${currentGroup.productIds.includes(p.id)?'Remove from':'Add to'} ${e(currentGroup.name)}" aria-pressed="${currentGroup.productIds.includes(p.id)}">${currentGroup.productIds.includes(p.id)?'★':'☆'}</button>`:''}
      </div>`).join(''):registerTab!=='keypad'
        ?(searchText?'<p class="empty">No matching items. Clear the search to see more.</p>':'<p class="empty">No items in this group yet. Tap Edit items to add favorites.</p>'):'';
    $('keypadAmount').textContent=format(Number(amountDigits||'0'));
    $('addCustomAmount').disabled=!Number(amountDigits||0)||Number(amountDigits)>1000000;
  }
  function lineTotal(item){if(item.price===null||!Number.isSafeInteger(item.price))return null;return item.price*(item.qty||1);}
  function amounts(){const incomplete=state.cart.some(x=>lineTotal(x)===null||x.needsReview===true);const sub=state.cart.reduce((sum,x)=>sum+(lineTotal(x)||0),0);const percent=Number(state.taxPercent)||0;const tax=Math.round(sub*percent/100);return {sub,tax,total:sub+tax,incomplete};}
  function renderCart(){
    const a=amounts();
    $('cartList').innerHTML=state.cart.length?state.cart.map((x,i)=>`<div class="cartitem">
      <span class="cartQty" aria-label="Quantity ${e(x.qty)}">${e(x.qty)}×</span>
      <div class="itemText"><strong>${e(x.name)}</strong><small>${[x.variant||'',...(x.flavors||[]).map(id=>state.flavors.find(f=>f.id===id)?.name||'Removed flavor'),...(x.extras||[]).map(t=>t.name)].filter(Boolean).map(e).join(' · ')}</small></div>
      <div class="cartLineRight">
        <span class="itemprice">${format(lineTotal(x))}</span>
        <div class="cartLineActions">
          <button class="mini quantityAction" type="button" data-dec-cart="${i}" aria-label="Decrease quantity of ${e(x.name)}">−</button>
          <button class="mini quantityAction" type="button" data-inc-cart="${i}" aria-label="Increase quantity of ${e(x.name)}">＋</button>
          <button class="mini" type="button" data-edit-cart="${i}" aria-label="Edit ${e(x.name)}">Edit</button>
        </div>
      </div>
    </div>`).join('') :`<div class="cartEmpty"><span aria-hidden="true" class="cartEmptyIcon">▣</span><strong>Start a new sale</strong><small>Tap an item to add it to your order.</small></div>`;
    $('subtotal').textContent=format(a.sub);
    $('tax').textContent=format(a.tax);
    $('total').textContent=format(a.total);
    $('taxCaption').textContent=`(${Number(state.taxPercent)||0}%)`;
    const paid=state.paidSaleId===state.saleId;
    $('checkout').disabled=!state.cart.length||a.incomplete||paid||a.total<=0;
    $('checkout').textContent=paid?'Test sale completed':a.incomplete?'Review item prices':'Charge '+format(a.total)+' · TEST';
    $('checkoutNotice').textContent=paid?'Sandbox payment reported success; do not charge this sale again.':a.incomplete?'One or more items came from an older snapshot and require price verification. Edit the product under More → Products.':'Tax is set manually. Verify tax, modifiers, total, and Square location before checkout.';
    $('cartItemCount').textContent=state.cart.reduce((n,x)=>n+(x.qty||1),0)+' items';
    const note=typeof state.saleNote==='string'?state.saleNote:'';
    $('saleNoteLabel').textContent=note?'Edit sale note':'Add sale note';
    $('saleNotePreview').hidden=!note;
    $('saleNotePreview').textContent=note;
    updateMobileCart();
    save();
  }
  function render(){
    catalog();renderCart();syncSquareStatus();
    if(operationsUI){
      $('opsActivityList').innerHTML=operationsUI.recentActivity();
    }
  }
  function productById(id){return state.products.find(p=>p.id===id);}
  // Like a register's quick tile: one tap adds a simple item.
  // Products with variations, flavors, or modifier choices always open the options sheet.
  function addFromGrid(productId){
    if(state.paidSaleId===state.saleId){toast('Clear the completed sale to begin another.');return;}
    const p=productById(productId);if(!p)return;
    if(!cartApi.canQuickAdd(p,modifiersApi.forProduct(state,p).length)){
      addOrEditItem(productId);return;
    }
    const qtyInCart=state.cart.filter(x=>x.productId===p.id).reduce((sum,x)=>sum+x.qty,0);
    if(!operationsApi.available(state,p.id,qtyInCart+1)){toast(p.name+' is out of locally tracked stock.');return;}
    const result=cartApi.addSimple(state,p,makeId);
    if(!result.ok){toast('Clear the completed sale first.');return;}
    save();render();toast(p.name+' added');
  }
  function addOrEditItem(productId,index=null){if(state.paidSaleId===state.saleId){toast('This test sale is complete. Clear the sale to begin another.');return;}const p=productById(productId);if(!p)return;const current=index===null?null:state.cart[index];let chosenVariant=current?.variant||p.variants?.[0]||'';let choices=current?.flavors?.slice()||Array(p.scoops||0).fill('').map(()=>state.flavors.find(f=>f.active)?.id||'');let extras=(current?.extras||[]).map(x=>x.name);
    const variations=(p.variants||[]).length?`<label class="field">Variation<select id="choiceVariant">${p.variants.map(v=>`<option value="${e(v)}" ${v===chosenVariant?'selected':''}>${e(v)}${p.variantPrices&&p.variantPrices[v]!=null?' ('+format(p.variantPrices[v])+')':''}</option>`).join('')}</select></label>`:'';
    const flavorRows=Array.from({length:p.scoops||0},(_,j)=>`<label class="field">Scoop ${j+1}<select class="flavorSelect" data-scoop="${j}">${state.flavors.filter(f=>f.active||choices[j]===f.id).map(f=>`<option value="${e(f.id)}" ${choices[j]===f.id?'selected':''}>${e(f.name)}${f.price?' (+'+format(f.price)+')':''}${!f.active?' (unavailable)':''}</option>`).join('')}</select></label>`).join('');
    const extraRows=(p.extras||[]).length?`<div class="divider"></div><strong>Modifiers</strong>${p.extras.map((x,j)=>`<label class="field"><input type="checkbox" data-extra="${j}" ${extras.includes(x.name)?'checked':''}> ${e(x.name)} (+${format(x.price)})</label>`).join('')}`:'';
    const appliedGroups=modifiersApi.forProduct(state,p);
    const groupRows=appliedGroups.map((group,j)=>{
      const limit=group.max===0?99:group.max;
      return `<div class="modifierGroup"><strong>${e(group.name)}</strong><small>${group.min>0?'Select at least '+group.min:'Optional'}${limit<99?' · Up to '+limit:''}</small><div class="modifierChoices">${(group.options||[]).map((opt,k)=>{
        const checked=(current?.extras||[]).some(x=>x.optionId===opt.id||(x.name===opt.name&&x.group===group.name));
        if(opt.active===false&&!checked)return '';
        return `<label><input type="checkbox" data-group="${j}" data-option="${k}" ${checked?'checked':''}><span>${e(opt.name)}${opt.price===null?' · PRICE NEEDED':' · '+format(opt.price)}${opt.active===false?' · unavailable (uncheck before saving)':''}</span></label>`;
      }).join('')}</div></div>`;
    }).join('');
    openModal(index===null?'Add '+p.name:'Edit cart item',variations+flavorRows+extraRows+groupRows+`<label class="field">Quantity<input id="quantity" type="number" inputmode="numeric" min="1" max="99" value="${current?.qty||1}"></label><p class="fine">Base price: ${format(p.price)}. Changes to base prices happen in Manage → Products.</p>`,[
      ...(index!==null?[{label:'Remove item',click:()=>{state.cart.splice(index,1);save();closeModal();render();}}]:[]),
      {label:'Cancel',click:closeModal},
      {label:index===null?'Add to cart':'Save changes',kind:'primary',click:()=>{
          const qty=Number($('quantity').value);if(!Number.isInteger(qty)||qty<1||qty>99){toast('Quantity must be 1–99');return;}
          const selectedFlavors=[...$('dialogBody').querySelectorAll('.flavorSelect')].map(el=>el.value);
          if(selectedFlavors.some(id=>!state.flavors.find(f=>f.id===id)?.active)){toast('Choose an available flavor');return;}
          const selectedExtras=[...$('dialogBody').querySelectorAll('[data-extra]:checked')].map(el=>p.extras[Number(el.dataset.extra)]);
          for(const [j,group] of appliedGroups.entries()){
            const checked=[...$('dialogBody').querySelectorAll('[data-group="'+j+'"]:checked')];
            const maximum=group.max===0?99:group.max;
            if(checked.length<(group.min||0)||checked.length>maximum){toast(group.name+': select '+(group.min||0)+' to '+maximum+' options.');return;}
            const choices=checked.map(el=>group.options[Number(el.dataset.option)]);
            if(choices.some(x=>x.active===false)){toast('This option is unavailable. Uncheck it before saving the cart item.');return;}
            if(choices.some(x=>x.price===null)){toast('A modifier price has not been verified. Update the item before checkout.');return;}
            selectedExtras.push(...choices.map(x=>({name:x.name,price:x.price,group:group.name,groupId:group.id,optionId:x.id})));
          }
          const selectedVariant=$('choiceVariant')?.value||'';
          const variablePrice=selectedVariant&&p.variantPrices&&Object.prototype.hasOwnProperty.call(p.variantPrices,selectedVariant)?p.variantPrices[selectedVariant]:p.price;
          const plus=selectedFlavors.reduce((sum,id)=>sum+(state.flavors.find(f=>f.id===id)?.price||0),0)+selectedExtras.reduce((sum,x)=>sum+(x.price||0),0);
          const price=variablePrice===null?null:variablePrice+plus;
          const item={key:makeId(),productId:p.id,name:p.name,variant:selectedVariant,flavors:selectedFlavors,extras:selectedExtras,price,qty,needsReview:p.reviewRequired===true};
          const already=state.cart.reduce((sum,existing,i)=>
            i!==index&&existing.productId===p.id?sum+existing.qty:sum,0);
          if(!operationsApi.available(state,p.id,already+qty)){
            toast('Not enough stock for '+p.name+'. Adjust Inventory in More.');return;
          }
          if(index===null)state.cart.push(item);else state.cart[index]=item;
          state.paidSaleId=null;save();closeModal();render();toast(index===null?'Added to cart':'Item updated');
      }}
    ]);
    if(p.scoops&&!state.flavors.some(f=>f.active))toast('No available flavors. Add flavors in Manage.');
  }
  function renderModifierOptionRow(option={}){
    const id=option.id||makeId();
    const dollars=option.price===null?'':((option.price??0)/100).toFixed(2);
    return `<div class="modifierEditRow" data-mod-option-row="${e(id)}">
      <label>Option name<input data-mod-option-name maxlength="80" placeholder="e.g. Purple" value="${e(option.name||'')}"></label>
      <label>Upcharge ($)<input data-mod-option-price inputmode="decimal" placeholder="0.00" value="${e(dollars)}"></label>
      <label class="modAvailability"><input type="checkbox" data-mod-option-active ${option.active!==false?'checked':''}><span>Available</span></label>
      <button type="button" class="modRemove" data-mod-option-remove aria-label="Remove ${e(option.name||'modifier option')}">✕</button>
    </div>`;
  }
  function openModifierGroupEditor(id=null){
    const group=id?state.modifierSets.find(g=>g.id===id):null;
    if(id&&!group){toast('Modifier group no longer exists');return;}
    const rows=(group?.options||[{id:makeId(),name:'',price:0,active:true}]).map(renderModifierOptionRow).join('');
    openModal(group?'Edit '+group.name:'New modifier group',
      `<p class="favoriteManagerHelp">Create modifier choices and their upcharges. This same group can be used by products in any category. Changes affect future additions to the cart and do not sync to Square.</p>
      <label class="field">Group name<input id="modGroupName" maxlength="80" placeholder="Example: Color options" value="${e(group?.name||'')}"></label>
      <div class="modifierLimits">
        <label class="field">Minimum choices<input id="modGroupMin" type="number" min="0" max="99" value="${group?.min??0}"></label>
        <label class="field">Maximum choices<input id="modGroupMax" type="number" min="0" max="99" value="${group?.max??1}"></label>
      </div>
      <p class="fine">Maximum 0 means unlimited. A blank option price means unverified, not free. Use 0.00 for no additional charge.</p>
      <div id="modifierOptionEditor">${rows}</div>
      <button type="button" class="secondary modAddOption" id="modAddOption">＋ Add modifier option</button>`,[
      ...(group?[{label:'Delete group',click:()=>{
        if(!confirm('Delete this modifier group from all assigned items? Product names, categories and previously added cart items are not deleted.'))return;
        modifiersApi.removeGroup(state,id);save();render();openModifierGroupsManager();toast('Modifier group deleted');
      }}]:[]),
      {label:'Cancel',click:openModifierGroupsManager},
      {label:'Save group',kind:'primary',click:()=>{
        const name=$('modGroupName').value.trim();
        const min=Number($('modGroupMin').value),max=Number($('modGroupMax').value);
        if(!Number.isInteger(min)||!Number.isInteger(max)){toast('Enter whole-number selection limits');return;}
        const options=[],rowEls=[...$('modifierOptionEditor').querySelectorAll('[data-mod-option-row]')];
        for(const row of rowEls){
          const n=row.querySelector('[data-mod-option-name]').value.trim();
          const cents=moneyIn(row.querySelector('[data-mod-option-price]').value);
          if(Number.isNaN(cents)){toast('Check the price for '+(n||'unnamed option'));return;}
          options.push({id:row.dataset.modOptionRow,name:n,price:cents,active:row.querySelector('[data-mod-option-active]').checked});
        }
        const result=modifiersApi.saveGroup(state,{name,min,max,options},id);
        if(!result.ok){toast(result.message);return;}
        save();render();openModifierGroupsManager();toast('Modifier group saved: '+result.group.name);
      }}
    ]);
  }
  function openModifierGroupsManager(){
    const rows=state.modifierSets.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(group=>{
      const count=state.products.filter(p=>(p.modifierGroupIds||[]).includes(group.id)).length;
      return `<div class="modManagerRow">
        <div class="modManagerLabel"><strong>${e(group.name)}</strong><small>${group.options.length} options · on ${count} products</small></div>
        <button type="button" class="secondary" data-mod-edit="${e(group.id)}">Edit</button>
        <button type="button" class="secondary" data-mod-category="${e(group.id)}">Assign</button>
      </div>`;
    }).join('');
    openModal('Manage modifier groups',
      '<p class="favoriteManagerHelp">Edit named modifier groups for items in <strong>all product categories</strong>. Choose Assign to add or remove a group from an entire category. For one item, edit that product and select its modifier groups.</p>'+
      (rows||'<p class="empty">No modifier groups yet. Create your first one.</p>'),[
      {label:'Close',click:closeModal},
      {label:'＋ Add group',kind:'primary',click:()=>openModifierGroupEditor()}
    ]);
  }
  function openAssignModifierCategory(id){
    const group=state.modifierSets.find(g=>g.id===id);
    if(!group)return;
    const categories=[...new Set(state.products.map(p=>p.category||'Other'))].sort((a,b)=>a.localeCompare(b));
    openModal('Assign '+group.name,
      `<p class="favoriteManagerHelp">Apply or remove this modifier group from every item in a category, or all items at once. Other modifier groups on those items are preserved.</p>
      <label class="field">Product category<select id="modifierApplyCategory">
        <option value="__all__">Every category / all products</option>
        ${categories.map(cat=>`<option value="${e(cat)}">${e(cat)}</option>`).join('')}
      </select></label>
      <p class="fine">Use Assign to add this modifier group. Remove from category detaches it from those products without deleting the group itself.</p>`,[
      {label:'Back',click:openModifierGroupsManager},
      {label:'Remove from category',click:()=>{
        const category=$('modifierApplyCategory').value;
        if(!confirm('Remove "'+group.name+'" from '+(category==='__all__'?'all products':category)+'?'))return;
        const total=modifiersApi.assignCategory(state,category,id,false);
        save();render();openModifierGroupsManager();toast('Removed from '+total+' products');
      }},
      {label:'Assign group',kind:'primary',click:()=>{
        const category=$('modifierApplyCategory').value;
        const total=modifiersApi.assignCategory(state,category,id,true);
        save();render();openModifierGroupsManager();toast('Assigned to '+total+' additional products');
      }}
    ]);
  }
  function editProduct(id=null){const p=id?productById(id):null;openModal(p?'Edit product':'New product',`
    <label class="field">Product name<input id="productName" maxlength="100" value="${e(p?.name||'')}"></label>
    <label class="field">Category<input id="productCategory" maxlength="35" value="${e(p?.category||'Crafts')}"></label>
    <label class="field">Product icon or emoji<input id="productIcon" maxlength="10" value="${e(p?.icon||'🧵')}"></label>
    <label class="field">Base price in dollars (leave blank if unverified)<input id="productPrice" type="text" inputmode="decimal" value="${p?.price===null||p===null?'':(p.price/100).toFixed(2)}"></label>
    ${p?.source==='saved-snapshot'?`<label class="field"><input type="checkbox" id="priceConfirmed" ${p.reviewRequired?'':'checked'}> I verified prices and modifiers against current Square</label><p class="fine">This item was restored from the previous register, not synced from Square. Review variations and modifiers before charging.</p>`:''}
    <label class="field">Variations (one per line)<textarea id="productVariants" rows="4" style="width:100%">${e((p?.variants||[]).join('\n'))}</textarea></label>
    <label class="field">Variation-specific prices (one per line: Variation|price in dollars)<textarea id="variationPriceLines" rows="4" style="width:100%" placeholder="Black OSU|25.00">${e((p?.variants||[]).map(v=>v+'|'+(p?.variantPrices?.[v]===null||p?.variantPrices?.[v]===undefined?'':(p.variantPrices[v]/100).toFixed(2))).join('\n'))}</textarea></label>
    <label class="field">Number of ice cream scoops (0–6)<input id="productScoops" type="number" min="0" max="6" value="${p?.scoops||0}"></label>
    <label class="field">Individual modifiers (one per line: name|upcharge in dollars)<textarea id="productExtras" rows="4" style="width:100%" placeholder="Gift wrap|1.00">${e((p?.extras||[]).map(x=>x.name+'|'+(x.price/100).toFixed(2)).join('\n'))}</textarea></label>
    <div class="divider"></div>
    <h3 class="modProductHeading">Modifier groups for this item</h3>
    <p class="fine">Select any reusable group below. These work on <strong>every category</strong>, and changes to a shared group update the choices shown across assigned items. To create or edit groups, choose More → Modifier groups.</p>
    <div class="productModifierChecklist">
      ${state.modifierSets.length?state.modifierSets.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<label>
        <input type="checkbox" data-product-group="${e(g.id)}" ${(p?.modifierGroupIds||[]).includes(g.id)?'checked':''}>
        <span>${e(g.name)} <small>${g.options.length} options</small></span>
      </label>`).join(''):'<p class="fine">No modifier groups yet. Create one in More → Modifier groups.</p>'}
    </div>
    <p class="fine">Updated prices and modifiers apply to future item additions. Existing cart items keep their previous choices until edited.</p>`,[
      ...(p?[{label:'Delete product',click:()=>{if(!confirm('Delete product from catalog? Items already in cart remain.'))return;state.products=state.products.filter(x=>x.id!==p.id);for(const g of state.favoriteGroups)g.productIds=g.productIds.filter(x=>x!==p.id);groupsApi.normalize(state);closeModal();render();}}]:[]),
      {label:'Cancel',click:closeModal},
      {label:'Save product',kind:'primary',click:()=>{
        const name=$('productName').value.trim(),cat=$('productCategory').value.trim(),price=moneyIn($('productPrice').value),scoops=Number($('productScoops').value);
        if(!name||!cat||Number.isNaN(price)||!Number.isInteger(scoops)||scoops<0||scoops>6){toast('Check product name, price and scoops');return;}
        const variants=$('productVariants').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,30);
        const extras=[];for(const line of $('productExtras').value.split('\n').map(x=>x.trim()).filter(Boolean)){
          const pieces=line.split('|');const name=pieces[0]?.trim();const amount=moneyIn(pieces[1]);if(!name||amount===null||Number.isNaN(amount)){toast('Invalid modifier. Use name|1.00');return;}extras.push({name,price:amount});
        }
        const variantPrices=Object.fromEntries(variants.map(v=>[v,p?.variantPrices?.[v]??price]));
        for(const line of $('variationPriceLines').value.split('\n').map(x=>x.trim()).filter(Boolean)){
          const split=line.indexOf('|');
          if(split<1){toast('Variation prices must use Name|0.00');return;}
          const variant=line.slice(0,split).trim(),amount=moneyIn(line.slice(split+1));
          if(!variants.includes(variant)||Number.isNaN(amount)){toast('Check variation name and price: '+variant);return;}
          variantPrices[variant]=amount;
        }
        const modifierGroupIds=[...$('dialogBody').querySelectorAll('[data-product-group]:checked')].map(el=>el.dataset.productGroup);
        const value={id:p?.id||makeId(),name,category:cat,icon:$('productIcon').value.trim()||'🧵',price,variants,variantPrices,scoops,extras,
          modifierGroups:p?.modifierGroups||[],modifierGroupIds,source:p?.source||'local',reviewRequired:p?.source==='saved-snapshot'?!($('priceConfirmed')?.checked):false};
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
      {label:'Modifier groups',click:openModifierGroupsManager},
      {label:'Restore saved library',click:restoreSavedCatalog},
      {label:'New product',click:()=>editProduct()},
      {label:'Save tax',kind:'primary',click:()=>{const rate=Number($('taxRate').value);if(!Number.isFinite(rate)||rate<0||rate>30){toast('Enter a tax rate from 0–30%');return;}state.taxPercent=rate;save();closeModal();render();toast('Tax updated');}}
    ]);
  }
  $('importFile').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;try{const src=JSON.parse(await file.text());if(!Array.isArray(src.products)||!Array.isArray(src.flavors)||!Array.isArray(src.cart))throw Error('Invalid backup');if(!confirm('Replace your current register settings and cart with this backup?'))return;state=src;groupsApi.normalize(state);modifiersApi.normalize(state);operationsApi.normalize(state);initOperationsUI();state.saleId=makeId();state.paidSaleId=null;state.pendingSquare=null;save();closeModal();render();toast('Backup restored — verify prices');}catch(_){toast('Could not import this backup');}finally{ev.target.value='';}});
  function squareState(){try{return window.LaurieSquare?.squareState?.()||'browser-preview';}catch(_){return 'unavailable';}}
  function syncSquareStatus(){const v=squareState(),text={'not-configured':'Add Sandbox app ID','unauthorized-sandbox':'Sandbox not connected','authorized-sandbox':'Sandbox connected','browser-preview':'Browser preview only','unavailable':'Square unavailable'};$('sqStatus').textContent=text[v]||v;}
  window.receiveSquareEvent=function(payload){let msg;try{msg=JSON.parse(payload);}catch(_){return;}
    if(msg.type==='success'){
      const pending=state.pendingSquare;
      const validPending=pending&&pending.saleId===state.saleId;
      const result=validPending?
        operationsApi.recordSale(state,'sandbox-card',pending.tipCents||0,null,msg.paymentId||''):
        {ok:false,error:'No matching pending checkout record.'};
      // A genuine SDK success must lock the sale even if local tracking could not be written.
      state.paidSaleId=state.saleId;state.pendingSquare=null;
      save();render();toast('Square SANDBOX approved a test payment.');
      alert('TEST PAYMENT APPROVED (not a real charge).\nPayment ID: '+(msg.paymentId||'Check Sandbox Dashboard')+
        '\n\n'+(result.ok?'Local sale and stock updated.':'Local activity could not be recorded: '+result.error)+
        '\n\nCart is kept for review. Use Clear to begin a new sale.');
    }
    else {toast(msg.message||msg.type);if(msg.type==='authorized')syncSquareStatus();}
  };
  $('categories').addEventListener('click',ev=>{const b=ev.target.closest('[data-cat]');if(b){category=b.dataset.cat;catalog();}});
  $('productGrid').addEventListener('click',ev=>{const b=ev.target.closest('[data-product]');if(b)addFromGrid(b.dataset.product);});
  $('cartList').addEventListener('click',ev=>{
    const edit=ev.target.closest('[data-edit-cart]');
    const increase=ev.target.closest('[data-inc-cart]');
    const decrease=ev.target.closest('[data-dec-cart]');
    if(!edit&&!increase&&!decrease)return;
    if(state.paidSaleId===state.saleId){toast('Clear the completed sale to change its items.');return;}
    const index=Number((edit||increase||decrease).dataset.editCart
      ??increase?.dataset.incCart??decrease?.dataset.decCart);
    const item=state.cart[index];if(!item)return;
    if(increase||decrease){
      if(increase&&item.productId!=='manual'){
        const count=state.cart.filter(x=>x.productId===item.productId).reduce((sum,x)=>sum+x.qty,0);
        if(!operationsApi.available(state,item.productId,count+1)){toast('Not enough locally tracked stock.');return;}
      }
      const result=cartApi.adjustQuantity(state,index,increase?1:-1);
      if(!result.ok){toast(result.reason==='maximum'?'Maximum 99 per line. Add another item instead.':'Unable to update this sale.');return;}
      save();render();return;
    }
    if(item.productId==='manual')editCustomItem(index);else addOrEditItem(item.productId,index);
  });
  $('dialogBody').addEventListener('click',ev=>{const b=ev.target.closest('[data-manage-product]');if(b)editProduct(b.dataset.manageProduct);});
  $('newProduct').onclick=()=>editProduct();$('settingsButton').onclick=manage;
  $('clearCart').onclick=()=>{
    if((state.cart.length||state.saleNote)&&!confirm('Clear this sale and its note? Check payment status in Square first if you attempted checkout.'))return;
    state.cart=[];state.saleNote='';state.saleId=makeId();state.paidSaleId=null;state.pendingSquare=null;operationsApi.normalize(state).selectedCustomerId=null;render();
  };
  $('saleNoteButton').onclick=()=>{
    if(state.paidSaleId===state.saleId){toast('Clear the completed sale before changing its note.');return;}
    openModal('Sale note',
      '<p class="favoriteManagerHelp">Add a note for this sale. Notes are stored with this device-local cart and included in the Square Sandbox payment note.</p>'+
      '<label class="field">Note<textarea id="saleNoteInput" rows="5" maxlength="240" placeholder="Optional sale notes">'+e(state.saleNote||'')+'</textarea></label>',[
      {label:'Cancel',click:closeModal},
      {label:'Save note',kind:'primary',click:()=>{state.saleNote=$('saleNoteInput').value.trim().slice(0,240);save();closeModal();render();toast(state.saleNote?'Sale note saved':'Sale note cleared');}}
    ]);
  };
  $('squareConnect').onclick=()=>{
    if(!window.LaurieSquare?.configureSquare){
      alert('Square Sandbox setup is only available inside the installed Laurie’s Creations Android APK. Open the app on your Zebra device, not a browser preview.');
      return;
    }
    toast('Opening Square Sandbox setup…');
    try {
      window.LaurieSquare.configureSquare();
    } catch (error) {
      alert('Could not open Square Sandbox setup: '+String(error?.message||error));
    }
  };
  $('squareDiagnostic').onclick=()=>{
    const status=squareState();
    const messages={
      'authorized-sandbox':'Square Sandbox is connected. Reader settings and test checkout should be available.',
      'unauthorized-sandbox':'Square SDK is initialized. Tap Connect Sandbox and enter Sandbox credentials.',
      'not-configured':'Square SDK is not ready on this device. Tap Connect Sandbox for a detailed explanation.',
      'browser-preview':'You are in a browser preview, not the installed Android app.',
      'unavailable':'Unable to read native Square status. The Android interface may not be available.'
    };
    alert('Laurie’s Creations POS v1.5.0\\n\\nSquare status: '+status+'\\n\\n'+(messages[status]||'Unknown SDK status.'))
  };
  $('readerSettings').onclick=()=>{if(window.LaurieSquare?.readerSettings)window.LaurieSquare.readerSettings();else toast('Reader settings are available in the Android APK');};
  $('checkout').onclick=()=>operationsUI.checkout();
  // Square-style navigation, favorites and custom amount keypad. All sale data remains local.
  function updateMobileCart(){
    const a=amounts();
    $('mobileCartAmount').textContent=format(a.total);
    $('mobileCartBar').hidden=activeNav!=='checkout'||state.cart.length===0;
  }
  function closeCartDrawer(){
    document.body.classList.remove('cart-open');
    $('cartScrim').hidden=true;
  }
  function showSection(which){
    activeNav=which;
    closeCartDrawer();
    $('checkoutWorkspace').hidden=which!=='checkout';
    $('activityPanel').hidden=which!=='activity';
    $('morePanel').hidden=which!=='more';
    for(const b of $('bottomNav').querySelectorAll('[data-nav]')){
      const isActive=b.dataset.nav===which;
      b.classList.toggle('active',isActive);
      if(isActive)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    }
    updateMobileCart();
    window.scrollTo(0,0);
  }
  function editCustomItem(index){
    if(state.paidSaleId===state.saleId){toast('Clear the completed sale before changing items.');return;}
    const item=state.cart[index];
    if(!item)return;
    openModal('Edit custom amount',
      '<label class="field">Price in dollars<input id="manualPrice" inputmode="decimal" value="'+e((item.price/100).toFixed(2))+'"></label>'+
      '<label class="field">Quantity<input id="manualQty" type="number" min="1" max="99" value="'+e(item.qty)+'"></label>',[
      {label:'Remove item',click:()=>{state.cart.splice(index,1);save();closeModal();render();}},
      {label:'Cancel',click:closeModal},
      {label:'Save',kind:'primary',click:()=>{
        const price=moneyIn($('manualPrice').value),qty=Number($('manualQty').value);
        if(!Number.isInteger(price)||price<=0||price>1000000||!Number.isInteger(qty)||qty<1||qty>99){toast('Check amount and quantity');return;}
        state.cart[index]={...item,price,qty};save();closeModal();render();
      }}
    ]);
  }
  function openCreateFavoritesTab(){
    openModal('Create Favorites tab',
      '<p class="favoriteManagerHelp">Create another group of favorite item buttons. Tabs are stored on this device and can be renamed or rearranged later.</p>'+
      '<label class="field">Tab name<input id="newFavoriteTabName" maxlength="30" placeholder="Example: Holiday Items" autocomplete="off"></label>',[
      {label:'Cancel',click:closeModal},
      {label:'Create tab',kind:'primary',click:()=>{
        const result=groupsApi.addGroup(state,$('newFavoriteTabName').value);
        if(!result.ok){toast(result.message);return;}
        registerTab='favorites';save();closeModal();render();toast(result.group.name+' tab created');
      }}
    ]);
    $('newFavoriteTabName').focus();
  }
  function openRenameFavoritesTab(id){
    const group=state.favoriteGroups.find(g=>g.id===id);
    if(!group)return;
    openModal('Rename Favorites tab',
      '<label class="field">Tab name<input id="renameFavoriteTabName" maxlength="30" autocomplete="off" value="'+e(group.name)+'"></label>',[
      {label:'Cancel',click:openManageFavoritesTabs},
      {label:'Save name',kind:'primary',click:()=>{
        const result=groupsApi.renameGroup(state,id,$('renameFavoriteTabName').value);
        if(!result.ok){toast(result.message);return;}
        save();render();openManageFavoritesTabs();toast('Tab renamed');
      }}
    ]);
    $('renameFavoriteTabName').focus();
  }
  function openManageFavoritesTabs(){
    const groups=state.favoriteGroups;
    const rows=groups.map((group,index)=>`
      <div class="favoriteGroupRow">
        <div class="groupName"><strong>${e(group.name)} ${state.activeFavoriteGroupId===group.id?'✓':''}</strong><small>${group.productIds.length} saved item(s)</small></div>
        <div class="favoriteGroupActions">
          <button type="button" data-fav-action="open" data-fav-id="${e(group.id)}" title="Open tab">Open</button>
          <button type="button" data-fav-action="items" data-fav-id="${e(group.id)}" title="Edit items">Items</button>
          <button type="button" data-fav-action="rename" data-fav-id="${e(group.id)}">Rename</button>
          <button type="button" data-fav-action="left" data-fav-id="${e(group.id)}" ${index===0?'disabled':''} aria-label="Move ${e(group.name)} left">←</button>
          <button type="button" data-fav-action="right" data-fav-id="${e(group.id)}" ${index===groups.length-1?'disabled':''} aria-label="Move ${e(group.name)} right">→</button>
          <button type="button" data-fav-action="delete" data-fav-id="${e(group.id)}" ${groups.length===1?'disabled':''}>Delete</button>
        </div>
      </div>`).join('');
    const vis=groupsApi.normalizeTabVisibility(state);
    const options=`<div class="utilityTabSettings">
      <strong>Optional checkout tabs</strong>
      <p class="favoriteManagerHelp">Show or hide these tabs individually. Both can be hidden. Favorites stay available, and hiding a tab never deletes any products or changes your cart.</p>
      <label class="utilityTabToggle"><input type="checkbox" data-utility-tab="keypad" ${vis.keypad?'checked':''}><span>Show Keypad<small>Custom amount entry</small></span></label>
      <label class="utilityTabToggle"><input type="checkbox" data-utility-tab="library" ${vis.library?'checked':''}><span>Show Library<small>Browse and search all products</small></span></label>
    </div>`;
    openModal('Edit Favorites tabs',
      '<p class="favoriteManagerHelp">Add your own tab names and groups. Use ← → to change the order. Deleting a tab never deletes your actual products.</p>'+options+rows,[
      {label:'Done',click:closeModal},
      {label:'＋ New tab',kind:'primary',click:openCreateFavoritesTab}
    ]);
  }
  function chooseFavoriteGroup(){
    const buttons=state.favoriteGroups.map(group=>`
      <button class="utilityRow" type="button" data-fav-action="select" data-fav-id="${e(group.id)}">★ ${e(group.name)} <span>${group.id===state.activeFavoriteGroupId?'✓':'›'}</span></button>`).join('');
    openModal('Choose Favorites group',
      '<p class="favoriteManagerHelp">Stars in the Item Library add or remove items from the chosen group.</p>'+buttons,[
      {label:'Cancel',click:closeModal},
      {label:'＋ New group',kind:'primary',click:openCreateFavoritesTab}
    ]);
  }
  function editFavoriteItems(id){
    const group=state.favoriteGroups.find(g=>g.id===id);
    if(!group)return;
    const selected=new Set(group.productIds);
    const rows=state.products.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`
      <label class="favoriteChoice">
        <input type="checkbox" data-favorite-item="${e(p.id)}" ${selected.has(p.id)?'checked':''}>
        <span>${e(p.icon||'🧵')} ${e(p.name)}<small> · ${e(p.category||'Other')}</small></span>
      </label>`).join('');
    openModal('Items in '+group.name,
      '<p class="favoriteManagerHelp">Check the products you want as buttons on this Favorites tab. Items remain available in the full Library even if unchecked.</p>'+
      '<label class="field">Search products<input id="favoriteItemsSearch" type="search" placeholder="Filter products" autocomplete="off"></label>'+
      '<div class="favoriteChooser" id="favoriteItemsChooser">'+rows+'</div>',[
      {label:'Cancel',click:closeModal},
      {label:'Reorder items',click:()=>reorderFavoriteItems(id)},
      {label:'Save favorites',kind:'primary',click:()=>{
        const chosen=[...$('favoriteItemsChooser').querySelectorAll('[data-favorite-item]:checked')].map(input=>input.dataset.favoriteItem);
        groupsApi.setProducts(state,id,chosen);
        state.activeFavoriteGroupId=id;registerTab='favorites';save();closeModal();render();toast('Favorites updated in '+group.name);
      }}
    ]);
    $('favoriteItemsSearch').addEventListener('input',ev=>{
      const query=ev.target.value.trim().toLowerCase();
      for(const row of $('favoriteItemsChooser').querySelectorAll('.favoriteChoice')){
        row.hidden=Boolean(query)&&!row.textContent.toLowerCase().includes(query);
      }
    });
  }
  function reorderFavoriteItems(id){
    const group=state.favoriteGroups.find(g=>g.id===id);
    if(!group)return;
    const existing=group.productIds.filter(productId=>state.products.some(p=>p.id===productId));
    const rows=existing.map((productId,index)=>{
      const p=productById(productId);
      return `<div class="favoriteItemRow">
        <span class="favoriteItemName">${e(p?.icon||'★')} ${e(p?.name||'Removed item')}</span>
        <div class="favoriteItemActions">
          <button type="button" data-fav-action="move-item-up" data-fav-id="${e(group.id)}" data-fav-product="${e(productId)}" ${index===0?'disabled':''} aria-label="Move ${e(p?.name||'item')} up">↑</button>
          <button type="button" data-fav-action="move-item-down" data-fav-id="${e(group.id)}" data-fav-product="${e(productId)}" ${index===existing.length-1?'disabled':''} aria-label="Move ${e(p?.name||'item')} down">↓</button>
        </div>
      </div>`;
    }).join('');
    openModal('Arrange '+group.name,
      '<p class="favoriteManagerHelp">Move favorite item buttons up or down. Changes save immediately.</p>'+(rows||'<p>No favorites selected yet. Add items first.</p>'),[
      {label:'Done',click:closeModal},
      {label:'＋ Edit items',kind:'primary',click:()=>editFavoriteItems(id)}
    ]);
  }
  function handleFavoriteManagerAction(button){
    const id=button.dataset.favId,action=button.dataset.favAction;
    if(action==='open'){
      state.activeFavoriteGroupId=id;registerTab='favorites';save();closeModal();render();return;
    }
    if(action==='select'){
      state.activeFavoriteGroupId=id;save();closeModal();catalog();toast('Stars now edit '+groupsApi.active(state).name);return;
    }
    if(action==='items'){editFavoriteItems(id);return;}
    if(action==='rename'){openRenameFavoritesTab(id);return;}
    if(action==='left'||action==='right'){
      if(groupsApi.moveGroup(state,id,action==='left'?-1:1)){save();render();openManageFavoritesTabs();}
      return;
    }
    if(action==='delete'){
      const group=state.favoriteGroups.find(g=>g.id===id);
      if(!group||state.favoriteGroups.length===1)return;
      if(!confirm('Delete the "'+group.name+'" Favorites tab? Your products will remain in the Item Library.'))return;
      groupsApi.removeGroup(state,id);save();render();openManageFavoritesTabs();toast('Tab deleted; products kept');return;
    }
    if(action==='move-item-up'||action==='move-item-down'){
      if(groupsApi.moveProduct(state,id,button.dataset.favProduct,action==='move-item-up'?-1:1)){
        save();render();reorderFavoriteItems(id);
      }
    }
  }
  $('registerTabs').addEventListener('click',ev=>{
    const create=ev.target.closest('[data-create-favorite-group]');
    if(create){openCreateFavoritesTab();return;}
    const groupButton=ev.target.closest('[data-group-id]');
    if(groupButton){
      state.activeFavoriteGroupId=groupButton.dataset.groupId;
      registerTab='favorites';searchText='';$('itemSearch').value='';save();catalog();return;
    }
    const btn=ev.target.closest('[data-register-tab]');
    if(btn){registerTab=btn.dataset.registerTab;searchText='';$('itemSearch').value='';catalog();}
  });
  $('itemSearch').addEventListener('input',ev=>{searchText=ev.target.value;catalog();});
  $('productGrid').addEventListener('click',ev=>{
    const favorite=ev.target.closest('[data-favorite]');if(!favorite)return;
    const id=favorite.dataset.favorite;
    const group=groupsApi.active(state);
    const added=groupsApi.toggleProduct(state,group.id,id);
    save();catalog();toast((added?'Added to ':'Removed from ')+group.name);
  });
  $('bottomNav').addEventListener('click',ev=>{
    const b=ev.target.closest('[data-nav]');if(b)showSection(b.dataset.nav);
  });
  $('manageFromMore').onclick=manage;
  $('flavorsFromMore').onclick=flavorsEditor;
  $('newFromMore').onclick=()=>editProduct();
  $('modifierGroupsFromMore').onclick=openModifierGroupsManager;
  $('dialogBody').addEventListener('click',ev=>{
    const edit=ev.target.closest('[data-mod-edit]');if(edit){openModifierGroupEditor(edit.dataset.modEdit);return;}
    const assign=ev.target.closest('[data-mod-category]');if(assign){openAssignModifierCategory(assign.dataset.modCategory);return;}
    const add=ev.target.closest('#modAddOption');
    if(add){
      const target=$('modifierOptionEditor');
      if(target.querySelectorAll('[data-mod-option-row]').length>=100){toast('Each group supports up to 100 options');return;}
      target.insertAdjacentHTML('beforeend',renderModifierOptionRow({id:makeId(),name:'',price:0,active:true}));
      const name=target.lastElementChild.querySelector('[data-mod-option-name]');name?.focus();return;
    }
    const remove=ev.target.closest('[data-mod-option-remove]');
    if(remove){
      const row=remove.closest('[data-mod-option-row]');
      row?.remove();return;
    }
  });
  $('manageFavoriteTabs').onclick=openManageFavoritesTabs;
  $('favoriteGroupsFromMore').onclick=openManageFavoritesTabs;
  $('editActiveFavorites').onclick=()=>editFavoriteItems(groupsApi.active(state).id);
  $('chooseFavoriteGroup').onclick=chooseFavoriteGroup;
  $('dialogBody').addEventListener('click',ev=>{
    const button=ev.target.closest('[data-fav-action]');
    if(button)handleFavoriteManagerAction(button);
  });
  $('dialogBody').addEventListener('change',ev=>{
    const toggle=ev.target.closest('[data-utility-tab]');
    if(!toggle)return;
    const which=toggle.dataset.utilityTab;
    if(groupsApi.setUtilityTabVisible(state,which,toggle.checked)){
      // Switching off the currently shown utility tab returns to Favorites.
      if(!toggle.checked&&registerTab===which)registerTab='favorites';
      save();catalog();
      toast((toggle.checked?'Showing ':'Hiding ')+(which==='keypad'?'Keypad':'Library')+' tab');
    }
  });

  function restoreSavedCatalog(){
    const incoming=Array.isArray(savedCatalog.products)?savedCatalog.products:[];
    if(!incoming.length){toast('No saved catalog is bundled in this app.');return;}
    if(!confirm('Restore Laurie’s Creations saved catalog? This adds missing items and flavors but will not overwrite existing products, prices or the current cart. The older snapshot is NOT a live Square sync.'))return;
    const existing=new Set(state.products.map(p=>p.name.trim().toLowerCase()));
    let count=0;
    for(const product of incoming){
      const key=product.name.trim().toLowerCase();
      if(existing.has(key))continue;
      state.products.push({...product});existing.add(key);count++;
    }
    const flavorNames=new Set(state.flavors.map(f=>f.name.trim().toLowerCase()));
    let addedFlavors=0;
    for(const flavor of savedCatalog.flavors||[]){
      const key=flavor.name.trim().toLowerCase();
      if(flavorNames.has(key))continue;
      state.flavors.push({...flavor});flavorNames.add(key);addedFlavors++;
    }
    state.savedCatalogVersion=savedCatalog.version;
    modifiersApi.normalize(state); // Convert restored old inline modifier groups into editable reusable ones.
    save();closeModal();render();
    toast('Restored '+count+' missing products and '+addedFlavors+' flavors.');
    showSection('checkout');registerTab='library';catalog();
  }
  $('restoreCatalog').onclick=restoreSavedCatalog;
  $('mobileCartBar').onclick=()=>{
    document.body.classList.add('cart-open');$('cartScrim').hidden=false;
  };
  $('closeCart').onclick=closeCartDrawer;
  $('cartScrim').onclick=closeCartDrawer;
  $('keypadPanel').addEventListener('click',ev=>{
    const key=ev.target.closest('[data-key]');if(!key)return;
    const digit=key.dataset.key;
    if(digit==='clear')amountDigits='';
    else if(digit==='back')amountDigits=amountDigits.slice(0,-1);
    else if(amountDigits.length<9){amountDigits=(amountDigits+digit).replace(/^0+(?=\d)/,'');}
    $('keypadAmount').textContent=format(Number(amountDigits||'0'));
    $('addCustomAmount').disabled=!Number(amountDigits||0)||Number(amountDigits)>1000000;
  });
  $('addCustomAmount').onclick=()=>{
    if(state.paidSaleId===state.saleId){toast('Clear the completed sale first.');return;}
    const cents=Number(amountDigits||0);
    if(!Number.isSafeInteger(cents)||cents<=0||cents>1000000){toast('Enter a custom amount from $0.01 to $10,000.00');return;}
    state.cart.push({key:makeId(),productId:'manual',name:'Custom amount',variant:'',flavors:[],extras:[],price:cents,qty:1});
    amountDigits='';save();render();toast('Custom amount added to sale');
  };
    initOperationsUI();
    $('staffTool').onclick=()=>operationsUI.staff();
    $('inventoryTool').onclick=()=>operationsUI.inventory();
    $('cashTool').onclick=()=>operationsUI.cashDrawer();
    $('loyaltyTool').onclick=()=>operationsUI.loyalty();
    $('displayTool').onclick=()=>operationsUI.displayPreview();
    $('paymentLinksTool').onclick=()=>operationsUI.connectionInfo('links');
    $('bankingTool').onclick=()=>operationsUI.connectionInfo('banking');
    render();document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSquareStatus();});
})();
