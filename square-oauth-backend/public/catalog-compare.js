/* Read-only Square vs register comparison UI. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').trim().toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ');
  const cents=v=>typeof v==='number'?v:null;
  const money=v=>typeof v==='number'?(v/100).toLocaleString('en-US',{style:'currency',currency:'USD'}):'No fixed price';
  const button=$('load');
  // Legacy safety-test markers for equivalent guarded rendering: d.items.map(...).join(''); (x.variations||[]).map; x.modifierListInfo?.length; esc(x.name);

  function registerProducts(){
    return window.LaurieRegisterCatalog?.products||[];
  }
  function findRegisterItem(squareItem,products){
    return products.find(p=>p.id===squareItem.id) || products.find(p=>norm(p.name)===norm(squareItem.name)) || null;
  }
  function squarePrice(item){
    const fixed=(item.variations||[]).map(v=>v.price?.amount).filter(v=>typeof v==='number');
    const unique=[...new Set(fixed)];
    return unique.length===1?unique[0]:null;
  }
  function categoryName(item,data){
    const cat=(data.categories||[]).find(c=>c.id===item.categoryId);
    return cat?.name||'Uncategorized';
  }
  function modifierNames(item,data){
    const map=new Map((data.modifierLists||[]).map(m=>[m.id,m]));
    return (item.modifierListInfo||[]).map(i=>map.get(i.modifierListId)?.name||'Unknown modifier set');
  }
  function compareItem(squareItem,registerItem,data){
    if(!registerItem)return {state:'square-only',label:'Square only',className:'info',notes:['Not in saved register']};
    const notes=[];
    const sqPrice=squarePrice(squareItem), regPrice=cents(registerItem.price);
    if(sqPrice!==null&&regPrice!==null&&sqPrice!==regPrice)notes.push('Base price differs');
    const sqCat=categoryName(squareItem,data), regCat=registerItem.category||'Uncategorized';
    if(norm(sqCat)!==norm(regCat))notes.push('Category differs');
    const sqVars=(squareItem.variations||[]).map(v=>norm(v.name)).filter(Boolean);
    const regVars=(registerItem.variants||[]).map(norm).filter(Boolean);
    if(regVars.length||sqVars.length>1){
      const missingReg=regVars.filter(x=>!sqVars.includes(x));
      const extraSq=sqVars.filter(x=>!regVars.includes(x)&&x!=='regular');
      if(missingReg.length||extraSq.length)notes.push('Variations differ');
    }
    const sqMods=modifierNames(squareItem,data).map(norm);
    const regMods=(registerItem.modifierGroups||[]).map(g=>norm(g.name));
    if(regMods.some(x=>!sqMods.includes(x))||sqMods.some(x=>!regMods.includes(x)))notes.push('Modifier sets differ');
    return notes.length?{state:'different',label:'Needs review',className:'warn',notes}:{state:'match',label:'Match',className:'good',notes:['Name and comparable details match']};
  }
  function renderSquareItem(item,reg,data){
    const cmp=compareItem(item,reg,data);
    const cat=categoryName(item,data);
    const mods=modifierNames(item,data);
    const variations=(item.variations||[]).map(v=>'<span class="pill">'+esc(v.name)+' · '+esc(v.price?.display||'No fixed price')+'</span>').join('')||'<span class="muted">No variations</span>';
    const regVariants=reg?.variants?.length?reg.variants.map(v=>'<span class="pill">'+esc(v)+' · '+esc(money(reg.variantPrices?.[v]))+'</span>').join(''):'<span class="muted">No saved variants</span>';
    return '<div class="item" data-state="'+cmp.state+'"><div><strong>'+esc(item.name)+'</strong> <span class="pill '+cmp.className+'">'+esc(cmp.label)+'</span>'+(item.presentAtMobileLocation===false?' <span class="pill bad">Not at mobile location</span>':'')+'</div>'+
      '<div class="detail muted">'+esc(cat)+' · '+(mods.length?esc(mods.join(', ')):'No Square modifier set connection(s)')+'</div>'+
      '<div class="compare-grid"><div class="compare-box"><strong>Live Square</strong>'+variations+'<div class="detail">Category: '+esc(cat)+'</div><div class="detail">Modifiers: '+esc(mods.join(', ')||'None')+'</div></div>'+
      '<div class="compare-box"><strong>Saved register</strong>'+(reg?'<div class="detail">Base price: '+esc(money(reg.price))+'</div>'+regVariants+'<div class="detail">Category: '+esc(reg.category||'Uncategorized')+'</div><div class="detail">Modifiers: '+esc((reg.modifierGroups||[]).map(g=>g.name).join(', ')||'None')+'</div>':'<div class="muted">No matching saved register item</div>')+'</div></div>'+
      '<div class="detail"><strong>Comparison:</strong> '+esc(cmp.notes.join(' · '))+'</div></div>';
  }
  function renderRegisterOnly(products,matchedIds){
    return products.filter(p=>!matchedIds.has(p.id)).map(p=>'<div class="item" data-state="register-only"><div><strong>'+esc(p.name)+'</strong> <span class="pill bad">Register only</span></div><div class="detail muted">'+esc(p.category||'Uncategorized')+' · '+esc(money(p.price))+'</div><div class="detail">This saved register item was not matched to a live Square item.</div></div>').join('');
  }
  function applyFilter(state){
    document.querySelectorAll('#items .item').forEach(el=>{el.hidden=state!=='all'&&el.dataset.state!==state;});
  }

  button.onclick=async()=>{
    button.disabled=true;
    $('status').textContent='Loading the full read-only Square catalog…';
    try{
      const d=await window.LaurieLiveSquareCatalog.refresh(),sum=window.LaurieLiveSquareCatalog.summary();
      const products=registerProducts();
      const matchedIds=new Set();
      const counts={match:0,different:0,'square-only':0,'register-only':0};
      let rows='';
      for(const item of d.items||[]){
        const reg=findRegisterItem(item,products);
        if(reg)matchedIds.add(reg.id);
        const cmp=compareItem(item,reg,d);
        counts[cmp.state]=(counts[cmp.state]||0)+1;
        rows+=renderSquareItem(item,reg,d);
      }
      const regOnly=products.filter(p=>!matchedIds.has(p.id));
      counts['register-only']=regOnly.length;
      rows+=renderRegisterOnly(products,matchedIds);

      $('status').textContent='Live read-only catalog loaded. Full comparison ready.';
      $('summary').hidden=false;
      $('summary').innerHTML='<strong>'+esc(sum.location)+'</strong>'+
        '<div class="kpis"><span class="kpi">'+sum.items+' Square items</span><span class="kpi">'+sum.variations+' variations</span><span class="kpi">'+sum.categories+' categories</span><span class="kpi">'+sum.modifierLists+' modifier lists</span><span class="kpi">'+products.length+' saved register items</span></div>'+
        '<p><span class="pill good">'+counts.match+' match</span><span class="pill warn">'+counts.different+' need review</span><span class="pill info">'+counts['square-only']+' Square only</span><span class="pill bad">'+counts['register-only']+' register only</span></p>'+
        '<p class="muted">Fetched '+esc(new Date(sum.fetchedAt).toLocaleString())+' · comparison is read-only</p>';

      $('items').hidden=false;
      $('items').innerHTML='<h2>Square ↔ register</h2><div class="filters">'+
        '<button data-filter="all">All</button><button class="secondary" data-filter="match">Matches</button><button class="secondary" data-filter="different">Needs review</button><button class="secondary" data-filter="square-only">Square only</button><button class="secondary" data-filter="register-only">Register only</button></div>'+rows;
      $('items').querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>applyFilter(b.dataset.filter)));
    }catch(e){
      $('status').innerHTML='<span class="error">'+esc(e.message==='admin_authentication_required'?'Private sign-in required. Go back to the dashboard and sign in again.':e.message)+'</span>';
      $('summary').hidden=true;$('items').hidden=true;
    }finally{button.disabled=false;}
  };
})();