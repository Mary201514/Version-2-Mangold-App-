let offlineRegistration,offlineReady=false,offlineRelease='',offlineProgress='',offlineError=false;
function offlineUi(){const el=document.querySelector('#offline-status'),button=document.querySelector('#offline-prepare');if(!el)return;el.textContent=offlineReady?(navigator.onLine?'Offline bereit auf diesem Gerät. Entwürfe, AD-PDF und Vorlagen sind lokal verfügbar.':'Kein Netzsignal · Offline bereit. Entwürfe, AD-PDF und Vorlagen sind lokal verfügbar.'):(offlineError?'Offline-Vorbereitung nicht abgeschlossen. Bitte mit Internet erneut vorbereiten.':offlineProgress||'Offline-Vorbereitung wird geprüft …');el.closest('section').classList.toggle('is-ready',offlineReady);el.closest('section').classList.toggle('is-error',offlineError);button.textContent=offlineRegistration?.waiting?'Neue Version laden':offlineReady?'Offline-Status prüfen':'Offline vorbereiten'}
async function checkOffline(){
 if(!offlineRegistration?.active){offlineUi();return}
 try{const result=await new Promise((resolve,reject)=>{const channel=new MessageChannel(),timeout=setTimeout(()=>reject(Error('STATUS_TIMEOUT')),5000);channel.port1.onmessage=e=>{clearTimeout(timeout);resolve(e.data);channel.port1.close()};offlineRegistration.active.postMessage({type:'OFFLINE_STATUS'},[channel.port2])});offlineReady=result.ready;offlineRelease=result.release;offlineError=!result.ready;offlineUi()}catch{offlineError=true;offlineUi()}
}
async function prepareOffline(){
 if(offlineRegistration?.waiting){save(true);if(!storageOK)return;offlineRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});return}
 offlineError=false;offlineProgress='Offline-Vorbereitung läuft …';offlineUi();
 try{offlineRegistration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});await offlineRegistration.update();await checkOffline()}catch{offlineError=true;offlineUi()}
}
function installOffline(){
 if(!('serviceWorker'in navigator)||!isSecureContext){offlineError=true;offlineProgress='';offlineUi();document.querySelector('#offline-status').textContent='Offline-Installation wird hier nicht unterstützt. Öffne die App über die HTTPS-Adresse in Chrome oder Edge.';return}
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_PROGRESS'){offlineProgress='Offline vorbereiten: '+event.data.done+' / '+event.data.total+' Dateien';offlineUi()}else if(event.data?.type==='OFFLINE_READY')checkOffline();else if(event.data?.type==='OFFLINE_ERROR'){offlineError=true;offlineUi()}});
 navigator.serviceWorker.addEventListener('controllerchange',()=>checkOffline());window.addEventListener('online',offlineUi);window.addEventListener('offline',offlineUi);
 navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{offlineRegistration=reg;checkOffline();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(reg.waiting)offlineProgress='Eine neue Version ist vorbereitet.';checkOffline()}if(worker.state==='redundant'&&!offlineReady){offlineError=true;offlineUi()}})})}).catch(()=>{offlineError=true;offlineUi()});offlineUi();
}
