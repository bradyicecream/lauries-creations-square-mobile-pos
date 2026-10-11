/* Device-local checkout helpers for one-tap product entry and cart quantity changes.
   No Square SDK calls, no production payment processing. */
(function(root){
  'use strict';
  function canQuickAdd(p,modifierCount=0){
    return !!p&&Array.isArray(p.variants)&&p.variants.length===0
      &&(!Array.isArray(p.extras)||p.extras.length===0)
      &&!p.scoops&&modifierCount===0
      &&Number.isSafeInteger(p.price)&&p.price>=0&&p.reviewRequired!==true;
  }
  function addSimple(state,p,idCreator){
    if(state.paidSaleId===state.saleId)return {ok:false,reason:'complete'};
    const current=state.cart.find(x=>x.productId===p.id&&!x.variant
      &&!(x.flavors||[]).length&&!(x.extras||[]).length&&x.price===p.price
      &&!x.needsReview&&x.qty>=1&&x.qty<99);
    if(current){current.qty+=1;return {ok:true,merged:true,qty:current.qty};}
    state.cart.push({key:idCreator(),productId:p.id,name:p.name,variant:'',flavors:[],
      extras:[],price:p.price,qty:1,needsReview:false});
    return {ok:true,merged:false,qty:1};
  }
  function adjustQuantity(state,index,direction){
    if(state.paidSaleId===state.saleId)return {ok:false,reason:'complete'};
    const item=state.cart[index];
    if(!item||!Number.isInteger(direction)||Math.abs(direction)!==1)
      return {ok:false,reason:'invalid'};
    const next=item.qty+direction;
    if(next>99)return {ok:false,reason:'maximum'};
    if(next<=0){state.cart.splice(index,1);return {ok:true,removed:true,qty:0};}
    item.qty=next;
    return {ok:true,removed:false,qty:next};
  }
  const api={canQuickAdd,addSimple,adjustQuantity};
  root.LaurieRegisterCart=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
