/* Laurie’s Creations settings and Square add-ons directory.
   Local preferences are functional and included in register backups.
   "Square account", "subscription" and "hardware" entries are DISCOVERY ONLY,
   never fake feature activation or external Square account synchronization.
*/
(function(root){
 'use strict';
 const categories=[
  {id:'checkout',name:'Checkout',icon:'▣',entries:[
   ['grid','Item grid & Favorites','local','Edit item tile pages, colors, favorites and categories','favorites'],
   ['checkoutPrefs','Register display & behavior','local','Quick-add, stock labels, tile density, clear-sale confirmation','preferences'],
   ['methods','Payment methods','local','Local cash and Square Sandbox test card checkout','paymentInfo'],
   ['tips','Tipping & required charges','local','Optional tips, card-only Gratuity, and service charge','charges'],
   ['tax','Taxes','local','No sales tax is calculated in this custom register','taxInfo'],
   ['receipts','Receipts & signatures','hardware','Receipt printer hardware and secure receipts are not connected'],
   ['discounts','Discounts, coupons & rewards','square','Requires real order and discount accounting before use'],
   ['tickets','Open tickets & split tender','square','Requires order lifecycle and payment processing integration'],
   ['refunds','Refunds & exchanges','square','Requires payment and order refund APIs'],
   ['offline','Offline payments','hardware','Not available in this Sandbox prototype']
  ]},
  {id:'items',name:'Items & inventory',icon:'▦',entries:[
   ['products','Item Library & variations','local','Edit products, options, and prices on this device','products'],
   ['modifiers','Modifier sets','local','Reusable modifier groups for all product categories','modifiers'],
   ['flavors','Ice cream flavors','local','Edit flavors and price upcharges','flavors'],
   ['stock','Inventory quantities','local','Local item-level stock counting and low stock alerts','inventory'],
   ['squareCatalog','Square Catalog sync','square','Needs secure Square Catalog API authorization'],
   ['squareInventory','Square Inventory sync','square','Needs Square Inventory API and location mapping'],
   ['barcodes','Barcode scanner & labels','hardware','Needs device input integration and compatible printer'],
   ['suppliers','Vendors & purchase orders','subscription','Advanced inventory capabilities and secure data storage'],
   ['transfers','Inventory transfers','square','Needs multiple locations and transfer integration']
  ]},
  {id:'customers',name:'Customers & engagement',icon:'♡',entries:[
   ['customerTest','Local loyalty test','preview','Test customer labels and points on this device only','loyalty'],
   ['customerDirectory','Square Customer Directory','square','Requires Customers API authorization'],
   ['loyalty','Square Loyalty & rewards','subscription','Requires eligible Square Loyalty subscription and APIs'],
   ['giftCards','Gift cards','square','Requires Square Gift Cards API and payment flow'],
   ['marketing','Email & text marketing','subscription','Requires Square Marketing subscription and customer consent'],
   ['feedback','Customer feedback & reviews','subscription','Available through eligible Square services']
  ]},
  {id:'staff',name:'Staff & shifts',icon:'♙',entries:[
   ['staffTest','Staff & timecards','local','Local names and shift timestamps; not payroll records','staff'],
   ['permissions','Team roles & permissions','square','Requires secure identity and Square team permissions'],
   ['scheduling','Team scheduling','subscription','Requires eligible staff scheduling service'],
   ['payroll','Payroll','subscription','Requires official Square Payroll enrollment'],
   ['clockSync','Square timecards sync','square','Needs secure Team/Labor API integration']
  ]},
  {id:'devices',name:'Hardware & devices',icon:'▤',entries:[
   ['reader','Reader connection','local','Square Sandbox connection and reader settings','reader'],
   ['customerPreview','Live customer display','local','Read-only cart on second iPad/Zebra over same Wi-Fi; Android APK only','display'],
   ['displayPairing','Display pairing code','local','Open Live customer display to pair a second screen','display'],
   ['printers','Receipt & kitchen printers','hardware','Requires a supported device printer bridge'],
   ['cashDrawer','Cash drawer connection','hardware','Requires supported hardware and printer bridge'],
   ['scanner','Barcode & NFC scanner','hardware','Requires compatible device and verified scanner integration'],
   ['modes','Register modes & device profiles','square','Square modes and profiles cannot be remotely cloned into this app'],
   ['kiosk','Self-service kiosk','subscription','Requires separate kiosk workflow and eligible service']
  ]},
  {id:'money',name:'Payments & money',icon:'$',entries:[
   ['cash','Cash management','local','Open/close float, paid in/out, and counted cash','cash'],
   ['activity','Transactions & activity','local','Local cash ledger and Sandbox test payment records','activity'],
   ['paymentLinks','Payment links','square','Needs secure Square Checkout API backend','paymentLinks'],
   ['invoices','Invoices & estimates','square','Requires official Square Invoices integration'],
   ['subscriptions','Subscriptions & recurring billing','square','Requires secure subscriptions and customer payment methods'],
   ['banking','Square Banking & payouts','square','Use authenticated Square Dashboard for balances and transfers','banking'],
   ['reports','Square Sales analytics','square','Needs authorized Orders and Payments API data'],
   ['disputes','Disputes & chargebacks','square','Managed through Square Dashboard']
  ]},
  {id:'business',name:'Business & extensions',icon:'⚙',entries:[
   ['identity','Business profile & branding','square','Square locations and business identity live in Square Dashboard'],
   ['multiple','Multi-location register','square','Requires locations mapping and per-location Square credentials'],
   ['online','Square Online & websites','subscription','Requires Square Online and eCommerce integrations'],
   ['appointments','Bookings & appointments','subscription','Requires advanced Bookings or Appointments service'],
   ['restaurant','Restaurant modes & menus','subscription','Requires appropriate Restaurants capabilities'],
   ['retail','Advanced retail features','subscription','Requires appropriate Inventory/Retail capabilities'],
   ['apps','App Marketplace add-ons','square','Square apps are separately connected and may have charges'],
   ['backup','Backup this register','local','Export local register data before reinstalling','backup']
  ]}
 ];
 const defaults=Object.freeze({quickAddSimpleItems:true,showStockOnTiles:true,
   compactFavoritesGrid:true,confirmClearSale:true,showEmptyGridSlots:true});
 const localTypes=new Set(['local','preview']);
 function normalize(state){
   const source=state.registerPreferences&&typeof state.registerPreferences==='object'&&!Array.isArray(state.registerPreferences)?
     state.registerPreferences:{};
   const value={};
   for(const [key,defaultValue] of Object.entries(defaults))
     value[key]=typeof source[key]==='boolean'?source[key]:defaultValue;
   state.registerPreferences=value;
   return value;
 }
 function update(state,key,value){
   if(!Object.hasOwn(defaults,key)||typeof value!=='boolean')return false;
   normalize(state);state.registerPreferences[key]=value;return true;
 }
 function lookup(id){
   for(const category of categories){
     const found=category.entries.find(x=>x[0]===id);
     if(found)return {category:category.id,id:found[0],name:found[1],status:found[2],description:found[3],action:found[4]||null};
   }
   return null;
 }
 function counts(){
   const all=categories.flatMap(c=>c.entries);
   return {total:all.length,onDevice:all.filter(e=>localTypes.has(e[2])).length,
     needConnection:all.filter(e=>!localTypes.has(e[2])).length};
 }
 const api={categories,defaults,normalize,update,lookup,counts};
 root.LaurieSettingsCatalog=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
