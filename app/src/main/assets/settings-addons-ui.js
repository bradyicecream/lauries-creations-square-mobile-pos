/* Touch-friendly settings hub for independent Laurie’s Creations Sandbox register.
   UI status is explicit: On this device, Local preview, Square connection, Extra hardware, Paid/eligible service.
*/
(function(root){
 'use strict';
 const model=root.LaurieSettingsCatalog;
 const labels={local:'On this device',preview:'Local preview',square:'Square connection required',
   hardware:'Additional hardware required',subscription:'Square subscription/service'};
 function init(state,ctx){
   const {$,escape:e,openModal,closeModal,save,render,toast,actions}=ctx;
   function status(type){return labels[type]||'Unavailable';}
   function card(x){
     const [id,name,type,description]=x;
     return '<button class="settingsEntry" type="button" data-settings-entry="'+e(id)+'">'+
       '<span class="settingsEntryMain"><strong>'+e(name)+'</strong><small>'+e(description)+'</small></span>'+
       '<span class="settingsEntryAside"><span class="settingsStatus type-'+e(type)+'">'+e(status(type))+'</span><span class="settingsChevron" aria-hidden="true">›</span></span></button>';
   }
   function header(title,description){
     return '<div class="settingsBanner"><strong>'+e(title)+'</strong><p>'+e(description)+'</p></div>';
   }
   function hub(query=''){
     const q=query.trim().toLowerCase(),matches=model.categories.filter(c=>
       !q||c.name.toLowerCase().includes(q)||c.entries.some(x=>[x[1],x[3]].join(' ').toLowerCase().includes(q)));
     const entries=matches.map(c=>({c,rows:q?c.entries.filter(x=>
       [x[1],x[3],c.name].join(' ').toLowerCase().includes(q)):c.entries})).filter(x=>x.rows.length);
     openModal('Settings & add-ons',
       header('Laurie’s Creations register settings',
         'Square-inspired settings directory. Existing tools work locally or in Sandbox. Square services are not activated by opening a setting.')+
       '<label class="field">Search settings<input id="settingsHubSearch" type="search" autocomplete="off" placeholder="Find checkout, devices, loyalty…"></label>'+
       '<div class="settingsCount"><span>'+model.counts().total+' settings & integrations</span>'+
         '<span>Device settings + connection guide</span></div>'+
       '<div id="settingsHubResults">'+(entries.length?entries.map(({c,rows})=>
         '<div class="settingsCategory"><h3>'+e(c.icon)+' '+e(c.name)+
         '<span>'+rows.length+'</span></h3>'+rows.map(card).join('')+'</div>').join(''):
         '<p class="fine">No settings match your search.</p>')+'</div>'+
       '<p class="settingsFootnote">Square app add-ons, subscriptions, and device features vary by account, region, plan and hardware. This app does not enable them automatically.</p>',
       [{label:'Close',click:closeModal},{label:'Register preferences',kind:'primary',click:preferences}]);
     const search=$('settingsHubSearch');
     if(search)search.oninput=()=>filter(search.value);
   }
   function filter(query){
     const q=query.trim().toLowerCase();
     for(const section of $('settingsHubResults').querySelectorAll('.settingsCategory')){
       const header=section.querySelector('h3').textContent.toLowerCase();
       let visible=0;
       for(const entry of section.querySelectorAll('.settingsEntry')){
         const pass=!q||header.includes(q)||entry.textContent.toLowerCase().includes(q);
         entry.hidden=!pass;if(pass)visible++;
       }
       section.hidden=visible===0;
       section.querySelector('h3 span').textContent=visible;
     }
   }
   function category(id){
     const c=model.categories.find(x=>x.id===id);
     if(!c)return hub();
     openModal(c.name,
       header(c.name,'Device settings are interactive. Items that need Square or separate hardware show what still has to be connected.')+
       '<div class="settingsCategory">'+c.entries.map(card).join('')+'</div>',[
         {label:'Back to all settings',click:()=>hub()},{label:'Done',kind:'primary',click:closeModal}
       ]);
   }
   function preferences(){
     const pref=model.normalize(state);
     const checks=[
       ['quickAddSimpleItems','One-tap simple items','Immediately add a priced item that has no variations or modifiers.'],
       ['showStockOnTiles','Stock count on item tiles','Show remaining locally tracked quantity on item and Favorites tiles.'],
       ['compactFavoritesGrid','Compact Favorites tiles','Fit more shortcut tiles on the register screen.'],
       ['showEmptyGridSlots','Show empty Favorites spaces','Keep empty tile placeholders visible outside Edit grid mode.'],
       ['confirmClearSale','Confirm before clearing a sale','Ask for confirmation when clearing an uncompleted cart.']
     ];
     openModal('Register preferences',
       header('Checkout display & behavior','These five switches really work and save in your register backup. They do not change Square POS or other devices.')+
       '<div class="settingsPreferenceList">'+checks.map(([id,title,description])=>
         '<label class="settingsToggle"><span><strong>'+e(title)+'</strong><small>'+e(description)+'</small></span>'+
         '<input type="checkbox" data-pref-key="'+e(id)+'" '+(pref[id]?'checked':'')+'></label>').join('')+
       '</div><p class="settingsFootnote">No local sales tax. Required Gratuity, when enabled, applies only to Square Sandbox card payments. Edit that separately under Gratuity & service charge.</p>',[
         {label:'Back',click:()=>hub()},
         {label:'Save preferences',kind:'primary',click:()=>{
           for(const input of $('dialogBody').querySelectorAll('[data-pref-key]'))
             model.update(state,input.dataset.prefKey,input.checked);
           save();render();closeModal();toast('Register preferences saved');
         }}
       ]);
   }
   function detail(id){
     const entry=model.lookup(id);if(!entry)return;
     if(entry.action==='preferences')return preferences();
     if(entry.action&&actions[entry.action]){
       closeModal();
       actions[entry.action]();
       return;
     }
     const info=entry.status==='square'?
       'This feature needs a secure Square account integration, appropriate API authorization, and possibly a separate backend. It is not active in this app.':
       entry.status==='hardware'?
       'This feature requires verified compatible equipment and often a device bridge. It is not connected in this app.':
       entry.status==='subscription'?
       'This feature depends on an eligible Square subscription or separately activated advanced capabilities. Enabling it in this custom register would not activate the service.':
       entry.status==='preview'?
       'A device-local preview exists, but this is not official Square synchronization.':
       'This tool is available locally on the register.';
     openModal(entry.name,
       '<p class="settingsServiceStatus type-'+e(entry.status)+'">'+e(status(entry.status))+'</p>'+
       '<p>'+e(entry.description)+'</p><p class="fine">'+e(info)+'</p>'+
       (entry.status==='square'||entry.status==='subscription'?
         '<p class="settingsFootnote">Use the official Square Dashboard to review the service and subscription eligibility. Never paste production access tokens into this app or public GitHub repositories.</p>':''),
       [
        {label:'Back',click:()=>category(entry.category)},
        ...(entry.status==='square'||entry.status==='subscription'?
          [{label:'Square Dashboard',kind:'primary',click:()=>{
            if(root.LaurieSquare?.openSquareDashboard)root.LaurieSquare.openSquareDashboard();
            else alert('Open https://squareup.com/dashboard in your browser and sign in directly.');
          }}]:[])
       ]);
   }
   // Delegated click works after openModal replaces the dialog body.
   function onClick(event){
     const section=event.target.closest('[data-settings-category]');
     if(section){category(section.dataset.settingsCategory);return;}
     const entry=event.target.closest('[data-settings-entry]');
     if(entry)detail(entry.dataset.settingsEntry);
   }
   $('dialogBody').addEventListener('click',onClick);
   return {hub,category,preferences,detail};
 }
 root.LaurieSettingsUI={init};
})(typeof window!=='undefined'?window:globalThis);
