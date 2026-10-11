/* Local, reusable modifier groups shared by products in any category.
   Migrates saved snapshot inline modifierGroups on first load.
   Does not read or write the Square Catalog API.
*/
(function(root){
 'use strict';
 const uid=()=>('MOD-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
 const isInt=n=>Number.isSafeInteger(n);
 const cleanName=n=>String(n??'').trim().replace(/\s+/g,' ').slice(0,80);
 const clone=x=>JSON.parse(JSON.stringify(x));
 function signature(group){
   return JSON.stringify({
     name:cleanName(group.name).toLowerCase(),
     min:group.min||0,max:group.max??0,
     options:(group.options||[]).map(o=>[cleanName(o.name).toLowerCase(),o.price??null,o.active!==false&&o.available!==false])
   });
 }
 function option(raw){
   return {id:String(raw.id||uid()),name:cleanName(raw.name),price:raw.price??null,active:raw.active!==false&&raw.available!==false};
 }
 function normalize(state){
   if(!Array.isArray(state.modifierSets))state.modifierSets=[];
   if(!Array.isArray(state.products))state.products=[];
   // Existing modifierSets are authoritative once saved. Preserve any explicit IDs.
   for(const group of state.modifierSets){
     if(!Array.isArray(group.options))group.options=[];
     group.options=group.options.map(option);
     if(!group.id)group.id=uid();
   }
   const seen=new Map(state.modifierSets.map(g=>[signature(g),g.id]));
   for(const product of state.products){
     if(!Array.isArray(product.modifierGroupIds)){
       product.modifierGroupIds=[];
       // Import existing inline groups rather than discarding 102 saved modifier options.
       for(const inline of Array.isArray(product.modifierGroups)?product.modifierGroups:[]){
         const group={name:cleanName(inline.name),min:Number(inline.min)||0,max:inline.max??0,options:(inline.options||[]).map(option)};
         if(!group.name)continue;
         const key=signature(group);
         let id=seen.get(key);
         if(!id){
           id=uid();state.modifierSets.push({...group,id});
           seen.set(key,id);
         }
         if(!product.modifierGroupIds.includes(id))product.modifierGroupIds.push(id);
       }
     }else{
       product.modifierGroupIds=[...new Set(product.modifierGroupIds)].filter(id=>state.modifierSets.some(g=>g.id===id));
     }
   }
   return state;
 }
 function validate(group,existingId=null,groups=[]){
   const name=cleanName(group.name);
   if(!name)return 'Enter a modifier group name.';
   if(!isInt(group.min)||group.min<0||group.min>99)return 'Minimum selections must be from 0 to 99.';
   if(!isInt(group.max)||group.max<0||group.max>99)return 'Maximum selections must be from 0 to 99 (0 means unlimited).';
   if(group.max!==0&&group.min>group.max)return 'Minimum cannot be higher than maximum.';
   if(!Array.isArray(group.options)||!group.options.length)return 'Add at least one modifier option.';
   if(group.options.length>100)return 'A group can contain up to 100 options.';
   const names=new Set();
   for(const opt of group.options){
     const n=cleanName(opt.name);
     if(!n)return 'Every modifier option needs a name.';
     if(names.has(n.toLowerCase()))return 'Modifier options cannot have duplicate names.';
     names.add(n.toLowerCase());
     if(opt.price!==null&&(!isInt(opt.price)||opt.price<0||opt.price>100000000))return 'A modifier upcharge must be zero or greater, or blank if unverified.';
   }
   const original=groups.find(g=>g.id===existingId);
   // Historical Square snapshots can contain distinct groups sharing the same name.
   // Allow those old groups to be edited without forcing the owner to rename them.
   const unchangedLegacyName=original&&original.name.toLowerCase()===name.toLowerCase();
   if(!unchangedLegacyName&&groups.some(g=>g.id!==existingId&&g.name.toLowerCase()===name.toLowerCase()))
     return 'A group with that name already exists. Rename it or edit the existing group.';
   return null;
 }
 function saveGroup(state,data,id=null){
   normalize(state);
   const input=clone(data),error=validate(input,id,state.modifierSets);
   if(error)return {ok:false,message:error};
   const existing=id?state.modifierSets.find(g=>g.id===id):null;
   if(id&&!existing)return {ok:false,message:'Modifier group not found.'};
   const group={id:existing?.id||uid(),name:cleanName(input.name),min:input.min,max:input.max,
     options:input.options.map(o=>({id:String(o.id||uid()),name:cleanName(o.name),price:o.price,active:o.active!==false}))};
   if(existing)state.modifierSets.splice(state.modifierSets.indexOf(existing),1,group);
   else state.modifierSets.push(group);
   return {ok:true,group};
 }
 function removeGroup(state,id){
   const index=state.modifierSets.findIndex(g=>g.id===id);
   if(index<0)return false;
   state.modifierSets.splice(index,1);
   for(const p of state.products)p.modifierGroupIds=(p.modifierGroupIds||[]).filter(x=>x!==id);
   return true;
 }
 function setProductGroups(state,productId,ids){
   const p=state.products.find(x=>x.id===productId);if(!p)return false;
   const valid=new Set(state.modifierSets.map(x=>x.id));
   p.modifierGroupIds=[...new Set(ids)].filter(id=>valid.has(id));
   return true;
 }
 function assignCategory(state,category,id,enable=true){
   if(!state.modifierSets.some(g=>g.id===id))return 0;
   let changed=0;
   for(const p of state.products){
     if(category!=='__all__'&&p.category!==category)continue;
     const current=p.modifierGroupIds||[];
     if(enable&&!current.includes(id)){p.modifierGroupIds=[...current,id];changed++;}
     else if(!enable&&current.includes(id)){p.modifierGroupIds=current.filter(x=>x!==id);changed++;}
   }
   return changed;
 }
 function forProduct(state,product){
   if(!product)return [];
   return (product.modifierGroupIds||[]).map(id=>state.modifierSets.find(g=>g.id===id)).filter(Boolean);
 }
 const api={normalize,validate,saveGroup,removeGroup,setProductGroups,assignCategory,forProduct};
 root.LaurieModifierGroups=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
