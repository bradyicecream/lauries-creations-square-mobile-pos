/* Independent Laurie’s Creations editable checkout grid.
   Inspired by a Square-style tile workflow, not official Square POS.
   Existing Favorite group product IDs remain the authoritative list.
   Shortcuts and tile colors remain device-local and are included in register backups.
*/
(function(root){
  'use strict';
  const COLORS=['purple','blue','teal','green','orange','pink','slate'];
  const uid=()=>('tile-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
  const clean=s=>String(s||'').trim().slice(0,60);
  const findGroup=(state,id)=>(state.favoriteGroups||[]).find(x=>x.id===id);
  const defaultColor=(category='')=>{
    const names=['Beads','Fidgets','Ice Cream','Tumblers','Pendants','Other'];
    const key=names.indexOf(category);
    if(key>=0)return ['purple','teal','blue','orange','pink','slate'][key];
    let hash=0;for(const ch of String(category))hash=(hash*31+ch.charCodeAt(0))|0;
    return COLORS[Math.abs(hash)%COLORS.length];
  };
  function normalize(state){
    if(!state.favoriteGridPages||typeof state.favoriteGridPages!=='object'||Array.isArray(state.favoriteGridPages))
      state.favoriteGridPages={};
    for(const group of state.favoriteGroups||[]){
      const source=state.favoriteGridPages[group.id];
      const page=Array.isArray(source)?source:[];
      const seenItems=new Set(),seenIds=new Set();
      const cleanPage=[];
      for(const item of page.slice(0,150)){
        if(!item||!['item','category','custom-amount'].includes(item.type))continue;
        const key=String(item.id||uid());
        if(seenIds.has(key))continue;
        if(item.type==='item'){
          if(typeof item.productId!=='string'||!group.productIds.includes(item.productId)||seenItems.has(item.productId))continue;
          seenItems.add(item.productId);
          cleanPage.push({id:key,type:'item',productId:item.productId,color:COLORS.includes(item.color)?item.color:defaultColor(state.products.find(p=>p.id===item.productId)?.category)});
        }else if(item.type==='category'){
          if(!clean(item.category))continue;
          cleanPage.push({id:key,type:'category',category:clean(item.category),color:COLORS.includes(item.color)?item.color:defaultColor(item.category)});
        }else{
          cleanPage.push({id:key,type:'custom-amount',color:COLORS.includes(item.color)?item.color:'slate'});
        }
        seenIds.add(key);
      }
      for(const productId of group.productIds||[]){
        if(!seenItems.has(productId)&&cleanPage.length<150){
          cleanPage.push({id:uid(),type:'item',productId,color:defaultColor(state.products.find(p=>p.id===productId)?.category)});
          seenItems.add(productId);
        }
      }
      state.favoriteGridPages[group.id]=cleanPage;
    }
    // Pages for removed groups are deleted; products and their data are never deleted here.
    for(const id of Object.keys(state.favoriteGridPages))
      if(!findGroup(state,id))delete state.favoriteGridPages[id];
    return state.favoriteGridPages;
  }
  function tiles(state,groupId){normalize(state);return state.favoriteGridPages[groupId]||[];}
  function addTile(state,groupId,data){
    normalize(state);
    const group=findGroup(state,groupId);
    if(!group)return {ok:false,error:'Favorites page was not found.'};
    const page=state.favoriteGridPages[groupId];
    if(page.length>=150)return {ok:false,error:'This page has reached 150 tiles.'};
    if(data.type==='item'){
      if(!state.products.some(p=>p.id===data.productId))return {ok:false,error:'Item not found in library.'};
      if(group.productIds.includes(data.productId))return {ok:false,error:'This item is already on the page.'};
      group.productIds.push(data.productId);
      // Keep compatibility with previous single-Favorites register backups.
      state.favorites=state.favoriteGroups[0].productIds.slice();
    }else if(data.type==='category'){
      if(!clean(data.category)||!state.products.some(p=>p.category===data.category))
        return {ok:false,error:'Choose an existing product category.'};
    }else if(data.type==='custom-amount'){
      if(page.some(tile=>tile.type==='custom-amount'))return {ok:false,error:'A custom amount shortcut already exists.'};
    }else return {ok:false,error:'Unsupported tile type.'};
    const tile={id:uid(),type:data.type,
      ...(data.type==='item'?{productId:data.productId}:{}),
      ...(data.type==='category'?{category:clean(data.category)}:{}),
      color:COLORS.includes(data.color)?data.color:'purple'};
    page.push(tile);
    return {ok:true,tile};
  }
  function removeTile(state,groupId,tileId){
    normalize(state);
    const group=findGroup(state,groupId);
    if(!group)return false;
    const page=state.favoriteGridPages[groupId];
    const index=page.findIndex(tile=>tile.id===tileId);
    if(index<0)return false;
    const [removed]=page.splice(index,1);
    if(removed.type==='item'){
      group.productIds=group.productIds.filter(p=>p!==removed.productId);
      state.favorites=state.favoriteGroups[0].productIds.slice();
    }
    return true;
  }
  function moveTile(state,groupId,tileId,delta){
    const page=tiles(state,groupId),i=page.findIndex(tile=>tile.id===tileId),j=i+delta;
    if(i<0||j<0||j>=page.length||!Number.isInteger(delta)||Math.abs(delta)!==1)return false;
    [page[i],page[j]]=[page[j],page[i]];
    const group=findGroup(state,groupId);
    group.productIds=page.filter(x=>x.type==='item').map(x=>x.productId);
    state.favorites=state.favoriteGroups[0].productIds.slice();
    return true;
  }
  function setColor(state,groupId,tileId,color){
    if(!COLORS.includes(color))return false;
    const tile=tiles(state,groupId).find(x=>x.id===tileId);
    if(!tile)return false;
    tile.color=color;return true;
  }
  const api={normalize,tiles,addTile,removeTile,moveTile,setColor,defaultColor,COLORS};
  root.LaurieRegisterGrid=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
