const assert=require('node:assert/strict');
const grid=require('../app/src/main/assets/register-grid.js');
const groups=require('../app/src/main/assets/favorite-groups.js');
const state={
  products:[
    {id:'fidget',name:'Click Fidget',category:'Fidgets'},
    {id:'bracelet',name:'Halloween Bracelet',category:'Beads'},
    {id:'tumbler',name:'Tumbler',category:'Tumblers'}
  ],
  favoriteGroups:[{id:'favorites-default',name:'Favorites',productIds:['fidget','bracelet']}],
  activeFavoriteGroupId:'favorites-default',favorites:['fidget','bracelet']
};
let page=grid.tiles(state,'favorites-default');
assert.deepEqual(page.map(t=>t.productId),['fidget','bracelet'],'Old Favorites become tile grid in saved order');
assert.ok(page.every(t=>t.type==='item'));
assert.equal(grid.addTile(state,'favorites-default',{type:'item',productId:'fidget'}).ok,false,'No duplicate item');
const result=grid.addTile(state,'favorites-default',{type:'category',category:'Tumblers',color:'blue'});
assert.equal(result.ok,true,'Category tile added');
const amount=grid.addTile(state,'favorites-default',{type:'custom-amount',color:'slate'});
assert.equal(amount.ok,true);
assert.equal(grid.addTile(state,'favorites-default',{type:'custom-amount'}).ok,false,'Single custom amount tile');
assert.equal(grid.setColor(state,'favorites-default',result.tile.id,'pink'),true);
assert.equal(grid.setColor(state,'favorites-default',result.tile.id,'not-valid'),false,'Reject injection via color');
assert.equal(grid.moveTile(state,'favorites-default',result.tile.id,-1),true,'Move tile before item');
page=grid.tiles(state,'favorites-default');
assert.equal(page[1].id,result.tile.id,'Shortcut position persisted');
assert.equal(state.favoriteGroups[0].productIds.length,2,'Shortcut reordering leaves item list valid');
const newItem=grid.addTile(state,'favorites-default',{type:'item',productId:'tumbler',color:'teal'});
assert.equal(newItem.ok,true);
assert.ok(state.favoriteGroups[0].productIds.includes('tumbler'));
assert.equal(grid.removeTile(state,'favorites-default',newItem.tile.id),true);
assert.ok(!state.favoriteGroups[0].productIds.includes('tumbler'),'Removing tile updates page membership');
assert.equal(state.products.length,3,'Removing tile never deletes item');
const before=grid.tiles(state,'favorites-default').find(t=>t.type==='category');
assert.equal(before.color,'pink');
const snapshot=JSON.parse(JSON.stringify(state));
grid.normalize(snapshot);
assert.deepEqual(snapshot.favoriteGridPages,state.favoriteGridPages,'Colors and shortcut order persist across backup');
groups.toggleProduct(snapshot,'favorites-default','tumbler');
grid.normalize(snapshot);
assert.ok(grid.tiles(snapshot,'favorites-default').some(t=>t.productId==='tumbler'),'Library favorite star adds tile');
groups.toggleProduct(snapshot,'favorites-default','bracelet');
grid.normalize(snapshot);
assert.ok(!grid.tiles(snapshot,'favorites-default').some(t=>t.productId==='bracelet'),'Unfavorite removes item tile');
const cat=grid.tiles(snapshot,'favorites-default').find(t=>t.type==='category');
assert.ok(cat,'Category shortcut retained while stars change');
const group=snapshot.favoriteGroups[0];
group.productIds=['tumbler','fidget'];
grid.alignItemOrder(snapshot,group.id);
assert.deepEqual(grid.tiles(snapshot,group.id).filter(t=>t.type==='item').map(t=>t.productId),['tumbler','fidget'],'Old Favorites reorder still reflected in grid');
assert.ok(grid.tiles(snapshot,group.id).some(t=>t.type==='custom-amount'),'Amount shortcut remains');
const second=groups.addGroup(snapshot,'Holiday');
assert.equal(second.ok,true);
grid.normalize(snapshot);
assert.equal(grid.tiles(snapshot,second.group.id).length,0,'New page starts empty');
assert.equal(groups.removeGroup(snapshot,second.group.id),true);
grid.normalize(snapshot);
assert.ok(!Object.hasOwn(snapshot.favoriteGridPages,second.group.id),'Deleted page cleaned up');
assert.ok(grid.COLORS.includes(grid.defaultColor('Beads')));
console.log('Square-like grid migration, page editing, category shortcuts, colors, reorder, backups and star compatibility passed.');
