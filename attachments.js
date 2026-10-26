// PDF bytes stay in IndexedDB, separately from the small text draft.
let pdfDatabase;
function openPdfDatabase(){
 if(!pdfDatabase)pdfDatabase=new Promise((resolve,reject)=>{
  const request=indexedDB.open('mangold-attachments-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('pdfs',{keyPath:'id'}).createIndex('job','job');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(Error('PDF-Speicher nicht verfügbar. Bitte die Originaldatei behalten und erneut versuchen.'));
 }).catch(error=>{pdfDatabase=null;throw error});
 return pdfDatabase;
}
async function pdfTransaction(mode,operation){
 const db=await openPdfDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('pdfs',mode);let result;
  const request=operation(tx.objectStore('pdfs'));
  request.onsuccess=()=>result=request.result;
  tx.oncomplete=()=>resolve(result);
  tx.onerror=tx.onabort=()=>reject(Error('PDF konnte nicht gespeichert oder geöffnet werden. Die Originaldatei bleibt unverändert.'));
 });
}
function attachmentPanel(){return `<section class="panel pdf-attachments"><h2>Prüfprotokolle als PDF</h2><p>Füge vorhandene PDF-Dateien zu diesem Auftrag hinzu.</p><input id="pdf-files" hidden type="file" accept="application/pdf,.pdf" multiple onchange="attachPdfFiles(this)"><button class="secondary" onclick="document.getElementById('pdf-files').click()">＋ Prüfprotokoll als PDF anhängen</button><p class="helper">Nur auf diesem Gerät gespeichert. Kein Versand an die KI. Je Datei höchstens 20 MB.</p><div id="pdf-attachment-list" aria-live="polite"></div></section>`}
async function refreshAttachments(){
 const container=$('#pdf-attachment-list');if(!container)return;
 const job=currentJobKey();
 try{
  const rows=await pdfTransaction('readonly',store=>store.index('job').getAll(job));
  if(!container.isConnected||job!==currentJobKey())return;
  container.innerHTML=rows.length?rows.map(row=>`<div class="attachment-row"><div><strong data-no-translate>${esc(row.name)}</strong><small>PDF · ${Math.ceil(row.size/1024)} KB · <span>Auf diesem Gerät gespeichert</span></small></div><div class="actions"><button class="secondary" onclick="downloadAttachment('${row.id}')">Öffnen / herunterladen</button><button class="subtle" onclick="removeAttachment('${row.id}')">Entfernen</button></div></div>`).join(''):'<p class="helper">Noch keine PDF angehängt.</p>';
 }catch(error){if(container.isConnected)container.textContent=error.message}
}
async function attachPdfFiles(input){
 const files=Array.from(input.files||[]),job=currentJobKey();input.value='';
 const button=input.nextElementSibling;button.disabled=true;
 let count=0;
 try{
  for(const file of files){
   if(!/\.pdf$/i.test(file.name)||file.size>20*1024*1024||file.size<5)throw Error('Bitte eine PDF-Datei bis 20 MB auswählen.');
   const bytes=await file.arrayBuffer();
   if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Diese Datei ist keine gültige PDF-Datei. Bitte die Originaldatei prüfen.');
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   const jobDigest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(job))),b=>b.toString(16).padStart(2,'0')).join('');
   const id=jobDigest+'-'+digest;
   const existing=await pdfTransaction('readonly',store=>store.get(id));
   if(!existing)await pdfTransaction('readwrite',store=>store.put({id,job,name:file.name,size:file.size,blob:new Blob([bytes],{type:'application/pdf'}),savedAt:new Date().toISOString()}));
   count++;
  }
  if(count)toast('PDF-Anhänge auf diesem Gerät gespeichert. Gleiche Dateien werden nicht doppelt angehängt.');
 }catch(error){toast(error.message||'Anhängen fehlgeschlagen. Bitte die Originaldatei behalten und erneut versuchen.')}
 finally{button.disabled=false;refreshAttachments()}
}
async function downloadAttachment(id){try{
 const row=await pdfTransaction('readonly',store=>store.get(id));
 if(!row||row.job!==currentJobKey())throw Error('PDF nicht gefunden. Bitte erneut anhängen.');
 const url=URL.createObjectURL(row.blob),link=document.createElement('a');link.href=url;link.download=row.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}catch(error){toast(error.message)}}
async function removeAttachment(id){try{
 const row=await pdfTransaction('readonly',store=>store.get(id));if(!row||row.job!==currentJobKey())return;
 await pdfTransaction('readwrite',store=>store.delete(id));refreshAttachments();toast('Anhang vom Auftrag entfernt. Die Originaldatei bleibt erhalten.');
}catch(error){toast(error.message)}}
