const assert=require('node:assert/strict');
const {prepare,apply}=require('../app/src/main/assets/square-item-import.js');
function fixture(){
  const state={products:[
    {id:'old-beads',name:'Bracelet',category:'Beads',price:100,variants:[],modifierGroupIds:['local-group'],scoops:0,extras:[],icon:'🟣'},
    {id:'other',name:'Tumbler',category:'Tumblers',price:2500,variants:['Black OSU']}
  ],modifierSets:[{id:'local-group',name:'Old shared group',min:0,max:1,options:[{id:'local-opt',name:'Old',price:50}]}],
    cart:[{productId:'old-beads',price:100,qty:1}],favorites:['old-beads'],flavors:[{id:'vanilla',name:'Vanilla',active:true}]};
  const packet={format:'lauries-square-item-v1',locationId:'LHV4RK9G8JN4T',item:{
    id:'square-bracelet',name:'Bracelet',category:'Beads',presentAtMobileLocation:true,
    variations:[{id:'variation-a',name:'Small',price:{amount:300,currency:'USD'}},{id:'variation-b',name:'Large',price:{amount:500,currency:'USD'}}],
    modifierGroups:[{id:'ribbon-list',name:'Ribbon',min:0,max:1,options:[{id:'ribbon-purple',name:'Purple',price:{amount:50,currency:'USD'}}]}]
  }};
  return {state,packet};
}
{
  const {state,packet}=fixture();
  const unrelated=JSON.stringify({other:state.products[1],cart:state.cart,favorites:state.favorites,flavors:state.flavors,group:state.modifierSets[0]});
  const proposal=prepare(state,packet);
  assert.equal(proposal.existingId,'old-beads');
  assert.equal(proposal.product.id,'old-beads');
  assert.equal(proposal.product.price,null); // Variation-dependent pricing
  assert.deepEqual(proposal.product.variantPrices,{Small:300,Large:500});
  assert.equal(proposal.groups[0].options[0].price,50);
  assert.equal(proposal.product.modifierGroupIds.length,1);
  const result=apply(state,proposal);
  assert.equal(result.updated,true);
  assert.equal(state.products.length,2);
  assert.equal(state.products[0].sourceSquareId,'square-bracelet');
  assert.equal(JSON.stringify({other:state.products[1],cart:state.cart,favorites:state.favorites,flavors:state.flavors,group:state.modifierSets[0]}),unrelated);
  assert.equal(state.modifierSets.length,2);
}
{
  const {state,packet}=fixture();packet.item.id='new-item';packet.item.name='New special';
  packet.item.variations=[{id:'one',name:'Regular',price:{amount:1000,currency:'USD'}}];
  const p=prepare(state,packet);
  assert.equal(p.product.price,1000);
  assert.equal(apply(state,p).updated,false);
  assert.equal(state.products.length,3);
}
{
  const {state,packet}=fixture();packet.locationId='wrong-location';
  assert.throws(()=>prepare(state,packet),/valid Laurie/);
}
{
  const {state,packet}=fixture();packet.item.variations[0].price={amount:300,currency:'EUR'};
  assert.throws(()=>prepare(state,packet),/unsupported/);
}
{
  const {state,packet}=fixture();packet.item.modifierGroups[0].options[0].price=null;
  const p=prepare(state,packet);
  assert.equal(p.priceNeedsReview,true);
  assert.equal(p.groups[0].options[0].price,null);
}
{
  const {state,packet}=fixture();packet.item.name='Missing';
  packet.item.presentAtMobileLocation=false;
  assert.throws(()=>prepare(state,packet),/not enabled/);
}
console.log('Single Square item import preserves other register data and validates location and prices.');
