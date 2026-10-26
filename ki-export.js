let currentKiExport=null;
function kiExportPanel(){return `<section class="panel ki-export-panel"><h2>Angaben für KI-Auswertung exportieren</h2><p>Exportiere die aktuellen Auftragsdaten, Berichtsfelder und Einträge in Prüfprotokollen für die manuelle Auswertung in ChatGPT Business.</p><button class="secondary" onclick="openKiExport()">KI-Auswertung exportieren</button><p class="helper">Keine API-Anfrage. Du prüfst den Export und übergibst ihn selbst. Original-PDFs werden nicht mitgeliefert.</p></section>`}
async function openKiExport(){
 const snapshot=structuredClone(state),job=currentJobKey();let attachments;
 try{const rows=await pdfTransaction('readonly',store=>store.index('job').getAll(job));attachments={status:'metadaten_gelesen',dateien:rows.map(row=>({dateiname:row.name,groesseBytes:row.size,gespeichertAm:row.savedAt}))}}catch{attachments={status:'nicht_lesbar',hinweis:'Die Liste lokaler PDF-Anhänge konnte nicht gelesen werden. Bitte benötigte PDFs separat prüfen.',dateien:[]}}
 const data=MangoldKiExport.create(snapshot,protocolCatalog,attachments,new Date().toISOString());
 const candidate={data,text:MangoldKiExport.text(data),json:JSON.stringify(data,null,2)};
 if(document.querySelector('#ki-export-dialog'))return;
 currentKiExport=candidate;
 const d=document.createElement('dialog');d.id='ki-export-dialog';d.className='ki-export-dialog';d.innerHTML=`<h2>Export für ChatGPT Business</h2><p>Prüfe die Angaben. Kopiere den Auswertungstext oder lade eine Datei herunter und füge sie selbst in eurem Business-Arbeitsbereich ein.</p><p class="callout">Der Export enthält nur den aktuell geöffneten Einsatz. Originaltexte, bearbeitete Felder und Protokolleinträge bleiben getrennt.</p>${attachments.status==='nicht_lesbar'?'<p class="ai-questions">Die Liste der PDF-Anhänge konnte nicht gelesen werden. Bitte benötigte PDFs separat prüfen.</p>':''}<label for="ki-export-preview">Auswertungstext mit allen Angaben</label><textarea id="ki-export-preview" data-no-translate readonly>${esc(candidate.text)}</textarea><div class="actions"><button class="primary" onclick="copyKiExport()">Auswertungstext kopieren</button><button class="secondary" onclick="downloadKiExport('txt')">Textdatei herunterladen</button><button class="secondary" onclick="downloadKiExport('json')">JSON herunterladen</button><button class="secondary" onclick="closeKiExport()">Schließen</button></div><p class="helper">Es wird nichts automatisch übertragen. Die KI-Antwort überschreibt keine Eingaben. Benötigte Original-PDFs und Anhänge bitte selbst ergänzen.</p>`;
 d.addEventListener('cancel',e=>{e.preventDefault();closeKiExport()});document.body.append(d);d.showModal();
}
function closeKiExport(){const d=document.querySelector('#ki-export-dialog');if(d){d.close();d.remove()}currentKiExport=null}
async function copyKiExport(){if(!currentKiExport)return;try{await navigator.clipboard.writeText(currentKiExport.text);toast('Auswertungstext kopiert. Füge ihn selbst in ChatGPT Business ein.')}catch{const field=$('#ki-export-preview');field.focus();field.select();toast('Automatisches Kopieren ist nicht verfügbar. Der Text ist markiert; bitte selbst kopieren.')}}
function downloadKiExport(format){
 if(!currentKiExport||!['txt','json'].includes(format))return;
 const content=format==='json'?currentKiExport.json:currentKiExport.text;
 const id=String(currentKiExport.data.auftrag.kennung).replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,80)||'Einsatz';
 const url=URL.createObjectURL(new Blob([content],{type:format==='json'?'application/json;charset=utf-8':'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=`Mangold-KI-Auswertung-${id}.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
