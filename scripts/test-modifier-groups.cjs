const assert=require('node:assert/strict');
const mod=require('../app/src/main/assets/modifier-groups.js');
const products=[
 {id:'craft',name:'Craft item',category:'Beads',modifierGroups:[{name:'Color',min:0,max:1,options:[{id:'purple',name:'Purple',price:0},{id:'blue',name:'Blue',price:50}]}]},
 {id:'bead2',name:'Bracelet',category:'Beads',modifierGroups:[{name:'Color',min:0,max:1,options:[{id:'purple2',name:'Purple',price:0},{id:'blue2',name:'Blue',price:50}]}]},
 {id:'dessert',name:'Ice cream',category:'Ice Cream',modifierGroups:[{name:'Topping',min:0,max:2,options:[{id:'s',name:'Sprinkles',price:25}]}]},
 {id:'fidget',name:'Fidget',category:'Fidgets',modifierGroups:[]}
];
const state={products:JSON.parse(JSON.stringify(products)),cart:[],taxPercent:7};
mod.normalize(state);
assert.equal(state.modifierSets.length,2,'Existing identical inline modifier groups dedupe');
const color=state.modifierSets.find(x=>x.name==='Color');
const topping=state.modifierSets.find(x=>x.name==='Topping');
assert.ok(color&&topping,'Legacy group names retained');
assert.deepEqual(state.products[0].modifierGroupIds,state.products[1].modifierGroupIds,'Shared group migrated');
assert.equal(mod.forProduct(state,state.products[0])[0].options[1].price,50,'Imported modifier prices preserved');
assert.equal(mod.forProduct(state,state.products[2])[0].name,'Topping','Different categories retain different modifiers');
mod.normalize(state);
assert.equal(state.modifierSets.length,2,'Idempotent migration');
const valid={name:'Gift wrap',min:0,max:1,options:[{name:'Basic',price:0,active:true},{name:'Fancy',price:125,active:true}]};
let result=mod.saveGroup(state,valid);
assert.equal(result.ok,true,'Create reusable group');
const wrap=result.group;
assert.equal(wrap.options[1].price,125);
assert.equal(mod.assignCategory(state,'Beads',wrap.id,true),2,'Assign group to entire category');
assert.equal(mod.forProduct(state,state.products[0]).length,2);
assert.equal(mod.forProduct(state,state.products[2]).length,1,'Other categories unchanged');
assert.equal(mod.assignCategory(state,'Beads',wrap.id,true),0,'Repeated assign is safe');
assert.equal(mod.assignCategory(state,'Beads',wrap.id,false),2,'Detach from category');
assert.equal(mod.assignCategory(state,'__all__',wrap.id,true),4,'Assign to all categories');
assert.equal(mod.assignCategory(state,'__all__',wrap.id,false),4,'Detach from all categories');
assert.equal(mod.setProductGroups(state,'fidget',[wrap.id,topping.id,wrap.id,'missing']),true,'Assign any named group to any product');
assert.deepEqual(state.products[3].modifierGroupIds,[wrap.id,topping.id],'Product group IDs unique and valid');
const changed={...valid,name:'Gift wrap',options:[{id:wrap.options[0].id,name:'Basic',price:0,active:false},{id:wrap.options[1].id,name:'Fancy',price:200,active:true}]};
result=mod.saveGroup(state,changed,wrap.id);
assert.equal(result.ok,true,'Edit existing group');
assert.equal(mod.forProduct(state,state.products[3]).find(x=>x.id===wrap.id).options[1].price,200,'Shared price edit visible in assigned product');
assert.equal(mod.forProduct(state,state.products[3]).find(x=>x.id===wrap.id).options[0].active,false,'Option availability retained');
assert.deepEqual(state.cart,[],'Editing groups leaves active cart alone');
const expectedBad=[
 {...valid,name:''},
 {...valid,min:3,max:2},
 {...valid,options:[]},
 {...valid,options:[{name:'A',price:-1}]},
 {...valid,options:[{name:'A',price:0},{name:'a',price:50}]}
];
for(const entry of expectedBad)assert.equal(mod.saveGroup(state,entry).ok,false,'Invalid modifiers rejected');
const oldDuplicates={products:[{id:'a',category:'Beads',modifierGroups:[{name:'Choices',min:0,max:1,options:[{name:'A',price:0}]}]},{id:'b',category:'Fidgets',modifierGroups:[{name:'Choices',min:0,max:1,options:[{name:'B',price:0}]}]}]};
mod.normalize(oldDuplicates);
assert.equal(oldDuplicates.modifierSets.length,2,'Same-name legacy groups with different options retained');
const old=oldDuplicates.modifierSets[0];
assert.equal(mod.saveGroup(oldDuplicates,{...old,options:[{...old.options[0],price:35}]},old.id).ok,true,'Existing same-name legacy group remains editable');
const backup=JSON.parse(JSON.stringify(state));
mod.normalize(backup);
assert.equal(backup.modifierSets.length,3,'Save and restore does not duplicate groups');
assert.equal(backup.products[3].modifierGroupIds.length,2,'Assignments persist in JSON backup');
assert.equal(mod.removeGroup(state,wrap.id),true,'Delete shared group');
assert.equal(state.products[3].modifierGroupIds.includes(wrap.id),false,'Removing group detaches from products');
assert.equal(state.products.length,4,'Deleting modifier does not delete products');
assert.equal(state.taxPercent,7,'Taxes remain unchanged');
console.log('Reusable modifier groups: migration, categories, options, availability, editing, backup and deletion passed.');
