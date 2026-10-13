/* Explicit single-item transfer from a verified Square catalog export.
   Offline register only: no Square credentials, payment calls or automatic sync.
*/
(function(root){
  'use strict';
  const FORMAT='lauries-square-item-v1';
  const LOCATION='LHV4RK9G8JN4T';
  const clean=(s,max)=>String(s??'').trim().replace(/\s+/g,' ').slice(0,max);
  const requireText=(s,max,label)=>{const v=clean(s,max);if(!v)throw Error(label+' is missing.');return v;};
  const price=value=>{
    if(value==null)return null;
    if(value.currency!=='USD'||!Number.isSafeInteger(value.amount)||value.amount<0||value.amount>100000000)
      throw Error('The item has an unsupported or invalid Square price.');
    return value.amount;
  };
  const key=name=>clean(name,100).toLowerCase().replace(/[’']/g,"'");
  function prepare(state,envelope){
    if(!state||!Array.isArray(state.products))throw Error('Register catalog is unavailable.');
    if(!envelope||envelope.format!==FORMAT||envelope.locationId!==LOCATION||
       !envelope.item||typeof envelope.item!=='object')
      throw Error('Choose a valid Laurie’s Creations Square item export.');
    const source=envelope.item;
    const squareId=requireText(source.id,120,'Square item ID');
    const name=requireText(source.name,100,'Item name');
    const category=requireText(source.category||'Uncategorized',35,'Category');
    if(source.presentAtMobileLocation===false)throw Error('This item is not enabled for the selected Square location.');
    if(!Array.isArray(source.variations)||source.variations.length>30)throw Error('Invalid Square variations.');
    const seenVariants=new Set();
    const variations=[];
    for(const v of source.variations){
      if(!v||v.presentAtMobileLocation===false)continue;
      const variationName=requireText(v.name,80,'Variation name');
      const k=key(variationName);
      if(seenVariants.has(k))throw Error('Square has duplicate variation names; review them before importing.');
      seenVariants.add(k);
      variations.push({name:variationName,price:price(v.price)});
    }
    const variantNames=variations.map(v=>v.name);
    const variantPrices=Object.fromEntries(variations.map(v=>[v.name,v.price]));
    const prices=variations.map(v=>v.price);
    const basePrice=prices.length&&prices.every(x=>x===prices[0])?prices[0]:null;
    if(!Array.isArray(source.modifierGroups)||source.modifierGroups.length>40)
      throw Error('Invalid Square modifier groups.');
    const groups=[];
    const seenGroups=new Set();
    let unknownPrice=prices.length===0||prices.some(v=>v===null);
    for(const group of source.modifierGroups){
      if(!group)throw Error('Invalid Square modifier set.');
      const sourceId=requireText(group.id,120,'Modifier group ID');
      if(seenGroups.has(sourceId))throw Error('Duplicate Square modifier group.');
      seenGroups.add(sourceId);
      const groupName=requireText(group.name,80,'Modifier group name');
      const min=group.min==null?0:group.min,max=group.max==null?0:group.max;
      if(!Number.isInteger(min)||min<0||min>99||!Number.isInteger(max)||max<0||max>99||(max!==0&&min>max))
        throw Error('Invalid modifier selection limits.');
      if(!Array.isArray(group.options)||group.options.length>100)
        throw Error('Invalid Square modifier options.');
      const seenOptions=new Set();
      const options=group.options.map(opt=>{
        if(!opt)throw Error('Invalid Square modifier option.');
        const optionId=requireText(opt.id,120,'Modifier ID');
        if(seenOptions.has(optionId))throw Error('Duplicate Square modifier option.');
        seenOptions.add(optionId);
        const amount=price(opt.price);
        if(amount===null)unknownPrice=true;
        return {id:'sq-option:'+optionId,name:requireText(opt.name,80,'Modifier name'),price:amount,active:true};
      });
      groups.push({id:'sq-group:'+squareId+':'+sourceId,name:groupName,min,max,options});
    }
    const byId=state.products.filter(p=>p.sourceSquareId===squareId||p.id===squareId||p.id==='sq-item:'+squareId);
    const candidates=byId.length?byId:state.products.filter(p=>key(p.name)===key(name));
    if(candidates.length>1)throw Error('Multiple register items match this Square item. Resolve duplicates before importing.');
    const existing=candidates[0]||null;
    const product={
      ...(existing||{}),
      id:existing?.id||'sq-item:'+squareId,
      sourceSquareId:squareId,
      sourceSquareLocation:LOCATION,
      name,category,
      icon:existing?.icon||'🧵',
      price:basePrice,
      variants:variantNames,
      variantPrices,
      // The imported Square modifier sets replace the old item-level selections.
      // Other products, local flavors, saved sales and checkout settings are untouched.
      extras:[],modifierGroups:[],modifierGroupIds:groups.map(g=>g.id),
      scoops:existing?.scoops||0,
      source:'square-item-import',
      reviewRequired:unknownPrice
    };
    return {product,groups,existingId:existing?.id||null,oldName:existing?.name||null,
      priceNeedsReview:unknownPrice};
  }
  function apply(state,prepared){
    if(!prepared||!prepared.product||!Array.isArray(prepared.groups))throw Error('Square item was not prepared.');
    if(!Array.isArray(state.products)||!Array.isArray(state.modifierSets))
      throw Error('Register data is incomplete.');
    const product=prepared.product;
    const idx=state.products.findIndex(p=>p.id===product.id);
    if(prepared.existingId&&idx<0)throw Error('Original register item has changed. Reload the import.');
    if(idx>=0)state.products[idx]=product;else state.products.push(product);
    for(const group of prepared.groups){
      const at=state.modifierSets.findIndex(g=>g.id===group.id);
      if(at>=0)state.modifierSets[at]=group;else state.modifierSets.push(group);
    }
    return {updated:idx>=0,name:product.name,priceNeedsReview:prepared.priceNeedsReview};
  }
  const api={prepare,apply,FORMAT,LOCATION};
  root.LaurieSquareItemImport=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
