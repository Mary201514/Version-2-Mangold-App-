// Generated release and asset list are injected by build.cjs.
const RELEASE=__RELEASE__,FILES=__FILES__,CACHE='mangold-offline-'+RELEASE,READY='/__mangold_offline_ready__';
async function notify(data){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage(data)}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);let done=0,index=0;
 try{await Promise.all(Array.from({length:4},async()=>{while(index<FILES.length){const path=FILES[index++],response=await fetch(new Request(path,{cache:'reload'}));if(!response.ok)throw Error('CACHE_FILE');await cache.put(path,response);done++;await notify({type:'OFFLINE_PROGRESS',done,total:FILES.length})}}));await cache.put(READY,new Response(RELEASE));}
 catch(error){await notify({type:'OFFLINE_ERROR'});throw error}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();await notify({type:'OFFLINE_READY',release:RELEASE});for(const name of await caches.keys())if(name.startsWith('mangold-offline-')&&name!==CACHE)await caches.delete(name)})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/sw.js')return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate')return await cache.match('/index.html')||fetch(event.request);return await cache.match(url.pathname)||fetch(event.request)})());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){self.skipWaiting();return}
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{const ready=!!(await (await caches.open(CACHE)).match(READY));event.ports[0]?.postMessage({ready,release:RELEASE,total:FILES.length})})());
});
