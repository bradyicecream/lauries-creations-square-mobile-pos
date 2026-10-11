/* Laurie’s Creations POS — editable favorite groups.
   Stored in existing device-local register state, never Square's catalog.
   The CommonJS export is used only by offline tests in GitHub Actions.
*/
(function (root) {
  'use strict';
  const MAX_GROUPS=30;
  const MAX_NAME=30;
  const uid=()=>('favorites-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
  function cleanName(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,MAX_NAME);}
  function updateLegacy(state){
    state.favorites=state.favoriteGroups[0].productIds.slice();
  }
  function normalize(state){
    if(!Array.isArray(state.favoriteGroups)||!state.favoriteGroups.length){
      const initial=Array.isArray(state.favorites)?state.favorites:(state.products||[]).slice(0,8).map(p=>p.id);
      state.favoriteGroups=[{id:'favorites-default',name:'Favorites',productIds:initial}];
    }
    const seenIds=new Set(),seenNames=new Set();
    const groups=[];
    for(const raw of state.favoriteGroups.slice(0,MAX_GROUPS)){
      if(!raw||typeof raw!=='object')continue;
      let id=typeof raw.id==='string'&&raw.id.trim()?raw.id.trim():uid();
      if(seenIds.has(id))id=uid();
      const name=cleanName(raw.name)||('Favorites '+(groups.length+1));
      if(seenNames.has(name.toLowerCase()))continue;
      const ids=new Set();
      for(const itemId of Array.isArray(raw.productIds)?raw.productIds:[]){
        if(typeof itemId==='string'&&itemId&& !ids.has(itemId))ids.add(itemId);
      }
      groups.push({id,name,productIds:[...ids]});
      seenIds.add(id);seenNames.add(name.toLowerCase());
    }
    if(!groups.length)groups.push({id:'favorites-default',name:'Favorites',productIds:[]});
    state.favoriteGroups=groups;
    if(!groups.some(g=>g.id===state.activeFavoriteGroupId))state.activeFavoriteGroupId=groups[0].id;
    updateLegacy(state);
    return state;
  }
  function active(state){return state.favoriteGroups.find(g=>g.id===state.activeFavoriteGroupId)||state.favoriteGroups[0];}
  function addGroup(state,name){
    normalize(state);
    const trimmed=cleanName(name);
    if(!trimmed)return {ok:false,message:'Enter a tab name.'};
    if(state.favoriteGroups.length>=MAX_GROUPS)return {ok:false,message:'You have reached the 30-tab limit.'};
    if(state.favoriteGroups.some(g=>g.name.toLowerCase()===trimmed.toLowerCase()))return {ok:false,message:'A tab with that name already exists.'};
    const group={id:uid(),name:trimmed,productIds:[]};
    state.favoriteGroups.push(group);state.activeFavoriteGroupId=group.id;updateLegacy(state);
    return {ok:true,group};
  }
  function renameGroup(state,id,name){
    const group=state.favoriteGroups.find(g=>g.id===id), trimmed=cleanName(name);
    if(!group)return {ok:false,message:'Tab not found.'};
    if(!trimmed)return {ok:false,message:'Enter a tab name.'};
    if(state.favoriteGroups.some(g=>g.id!==id&&g.name.toLowerCase()===trimmed.toLowerCase()))return {ok:false,message:'A tab with that name already exists.'};
    group.name=trimmed;return {ok:true,group};
  }
  function removeGroup(state,id){
    if(state.favoriteGroups.length<=1)return false;
    const index=state.favoriteGroups.findIndex(g=>g.id===id);if(index<0)return false;
    state.favoriteGroups.splice(index,1);
    if(state.activeFavoriteGroupId===id)state.activeFavoriteGroupId=state.favoriteGroups[Math.min(index,state.favoriteGroups.length-1)].id;
    updateLegacy(state);return true;
  }
  function moveGroup(state,id,direction){
    const index=state.favoriteGroups.findIndex(g=>g.id===id);
    const next=index+direction;
    if(index<0||next<0||next>=state.favoriteGroups.length)return false;
    [state.favoriteGroups[index],state.favoriteGroups[next]]=[state.favoriteGroups[next],state.favoriteGroups[index]];
    updateLegacy(state);return true;
  }
  function toggleProduct(state,id,productId){
    const group=state.favoriteGroups.find(g=>g.id===id);
    if(!group||!(state.products||[]).some(p=>p.id===productId))return false;
    const index=group.productIds.indexOf(productId);
    if(index>=0)group.productIds.splice(index,1);
    else group.productIds.push(productId);
    updateLegacy(state);return index<0;
  }
  function setProducts(state,id,productIds){
    const group=state.favoriteGroups.find(g=>g.id===id);
    if(!group)return false;
    const allowable=new Set((state.products||[]).map(p=>p.id));
    const wanted=new Set((Array.isArray(productIds)?productIds:[]).filter(x=>allowable.has(x)));
    // Keep existing favorite tile ordering, then append newly selected products.
    const ordered=group.productIds.filter(x=>wanted.has(x));
    for(const p of state.products||[])if(wanted.has(p.id)&&!ordered.includes(p.id))ordered.push(p.id);
    group.productIds=ordered;updateLegacy(state);return true;
  }
  function moveProduct(state,id,productId,direction){
    const group=state.favoriteGroups.find(g=>g.id===id);if(!group)return false;
    const i=group.productIds.indexOf(productId),j=i+direction;
    if(i<0||j<0||j>=group.productIds.length)return false;
    [group.productIds[i],group.productIds[j]]=[group.productIds[j],group.productIds[i]];
    updateLegacy(state);return true;
  }
  const api={normalize,active,addGroup,renameGroup,removeGroup,moveGroup,toggleProduct,setProducts,moveProduct};
  root.LaurieFavoriteGroups=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
