/* Private browser-side Square catalog reader. OAuth credentials never enter this file. */
(function(root){
  'use strict';
  const ENDPOINT='/oauth/api/catalog-readonly',EXPECTED_LOCATION='LHV4RK9G8JN4T';
  let snapshot=null;
  async function refresh(){
    const reply=await fetch(ENDPOINT,{method:'GET',headers:{accept:'application/json'},cache:'no-store',credentials:'same-origin'});
    const data=await reply.json().catch(()=>({}));
    if(!reply.ok)throw new Error(data.error||'Square catalog unavailable');
    if(data.mode!=='production-read-only'||data.location?.id!==EXPECTED_LOCATION)throw new Error('Square location verification failed');
    snapshot=data;
    return data;
  }
  function getSnapshot(){return snapshot;}
  function summary(){
    if(!snapshot)return{connected:false,location:'O.P. Gallo Mobile',items:0,variations:0,categories:0,modifierLists:0};
    return{connected:true,
      location:snapshot.location?.name||'O.P. Gallo Mobile',
      items:snapshot.items?.length||0,
      variations:(snapshot.items||[]).reduce((n,x)=>n+(x.variations?.length||0),0),
      categories:snapshot.categories?.length||0,
      modifierLists:snapshot.modifierLists?.length||0,
      fetchedAt:snapshot.fetchedAt
    };
  }
  root.LaurieLiveSquareCatalog={refresh,getSnapshot,summary,endpoint:ENDPOINT,locationId:EXPECTED_LOCATION};
})(typeof window!=='undefined'?window:globalThis);
