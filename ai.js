let aiConfig=null,aiBusy=false,aiAccess='',aiMessage='';
async function getAiConfig(){try{const response=await fetch('/api/report',{cache:'no-store'});if(!response.ok)throw Error();aiConfig=await response.json()}catch{aiConfig={enabled:false,unavailable:true}}return aiConfig}
function reportLanguage(){return 'de'}
function aiPanel(){
 const proposal=state.aiProposal;
 return `<section class="panel ai-panel"><h2>KI-Zuordnung und Berichtstext</h2><p>Der Originaltext bleibt erhalten. Ein Vorschlag wird erst nach deiner Übernahme in die Berichtsfelder eingetragen.</p><p class="helper">Berichte werden immer auf Deutsch erstellt.</p><div class="ai-state" role="status">${esc(aiBusy?'KI erstellt einen Vorschlag …':aiMessage||(!aiConfig?.enabled?'KI noch nicht freigeschaltet. Manuell dokumentieren ist weiterhin möglich.':'KI bereit · nur freigegebene künstliche Testdaten verwenden.'))}</div><button class="secondary" ${aiBusy?'disabled':''} onclick="requestAiProposal()">${proposal?'Neuen KI-Vorschlag erstellen':'KI-Vorschlag erstellen'}</button>${proposal?`<div class="callout">${proposal.text===state.text?'Vorschlag noch nicht geprüft. Kontrolliere Zuordnung und Formulierung.':'Der Originaltext wurde geändert. Erstelle einen neuen Vorschlag.'}</div><div class="form-grid">${fields.filter(([key])=>key!=='betriebsstunden').map(([key,label])=>`<div class="field ${['befund','arbeiten','material','maengel'].includes(key)?'wide':''}"><label for="ai-${key}">${label}</label><textarea id="ai-${key}" data-no-translate oninput="state.aiProposal.fields['${key}'].value=this.value;mark()">${esc(proposal.fields[key].value)}</textarea>${proposal.fields[key].sources.length?`<details><summary>Ursprüngliche Stichpunkte</summary><p class="ai-original" data-no-translate>${esc(proposal.fields[key].sources.join('\n'))}</p></details>`:''}</div>`).join('')}</div>${proposal.questions.length?`<div class="ai-questions"><h3>Rückfragen – bitte klären</h3><ul>${proposal.questions.map(q=>`<li data-no-translate>${esc(q)}</li>`).join('')}</ul></div>`:''}<p class="helper">Auch ein KI-Vorschlag kann Fehler enthalten. Kontrolliere technische Aussagen, Werte und Einheiten vor der Übernahme.</p><div class="actions"><button class="primary" ${proposal.text!==state.text?'disabled':''} onclick="acceptAiProposal()">Vorschlag übernehmen</button><button class="secondary" onclick="discardAiProposal()">Vorschlag verwerfen</button></div>`:''}</section>`;
}
function aiAccessDialog(){return new Promise(resolve=>{
 const d=document.createElement('dialog');d.className='ai-access';d.innerHTML=`<h2>KI für Testdaten freischalten</h2><p>Der Text wird zur Zuordnung und Formulierung an OpenAI gesendet. PDF-Anhänge werden nicht übertragen.</p><label for="ai-code">KI-Zugangscode</label><input id="ai-code" type="password" autocomplete="off"><label class="protocol-select"><input id="ai-test-data" type="checkbox"><span>Ich verwende ausschließlich künstliche Testdaten.</span></label><p class="helper">Den Zugangscode erhältst du von der Projektverwaltung. Er bleibt nur in dieser geöffneten Sitzung.</p><div class="actions"><button class="primary" id="ai-unlock">Vorschlag erstellen</button><button class="secondary" id="ai-cancel">Abbrechen</button></div>`;document.body.append(d);
 const close=value=>{d.close();d.remove();resolve(value)};
 d.querySelector('#ai-unlock').onclick=()=>{if(!d.querySelector('#ai-test-data').checked||!d.querySelector('#ai-code').value){toast('Zugangscode eingeben und künstliche Testdaten bestätigen.');return}aiAccess=d.querySelector('#ai-code').value;close(true)};
 d.querySelector('#ai-cancel').onclick=()=>close(false);d.addEventListener('cancel',e=>{e.preventDefault();close(false)});d.showModal();
})}
async function requestAiProposal(){
 if(aiBusy)return;
 if(!state.text.trim()){toast('Beschreibe zuerst deinen Einsatz oder probiere das Beispiel aus.');return}
 const text=state.text,job=currentJobKey(),language=reportLanguage();aiMessage='';aiBusy=true;render();
 try{
  const config=await getAiConfig();
  if(!config.enabled){aiMessage=config.unavailable?'KI-Verbindung nicht verfügbar. Deine Angaben bleiben erhalten; bitte manuell dokumentieren.':'KI noch nicht freigeschaltet. Manuell dokumentieren ist weiterhin möglich.';return}
  if(!aiAccess&&!await aiAccessDialog())return;
  if(job!==currentJobKey()||text!==state.text)return;
  const response=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json','X-Mangold-Access':aiAccess},body:JSON.stringify({text,language,testDataConfirmed:true}),signal:AbortSignal.timeout(55000)});
  const result=await response.json();
  if(!response.ok){if(response.status===401)aiAccess='';throw Error(({ACCESS:'KI-Zugangscode ungültig. Bitte erneut eingeben.',VALIDATION:'Der Vorschlag hat die Werteprüfung nicht bestanden. Bitte manuell dokumentieren oder erneut versuchen.',LIMIT:'KI gerade ausgelastet oder Nutzungslimit erreicht. Bitte später erneut versuchen.',NOT_CONFIGURED:'KI noch nicht freigeschaltet. Manuell dokumentieren ist weiterhin möglich.'})[result.error]||'KI nicht verfügbar. Deine Angaben bleiben erhalten. Bitte manuell dokumentieren oder erneut versuchen.')}
  if(job!==currentJobKey()||text!==state.text||language!==reportLanguage()){aiMessage='Die Angaben wurden zwischenzeitlich geändert. Bitte einen neuen Vorschlag erstellen.';return}
  state.aiProposal={...result,text,language};mark();aiMessage='KI-Vorschlag erstellt. Noch nicht geprüft.';
 }catch(error){aiMessage=error.name==='TimeoutError'||error.name==='TypeError'?'KI nicht verfügbar. Deine Angaben bleiben erhalten. Bitte manuell dokumentieren oder erneut versuchen.':error.message}
 finally{aiBusy=false;render()}
}
function acceptAiProposal(){
 const proposal=state.aiProposal;if(!proposal||proposal.text!==state.text)return;
 if(Object.values(state.fields).some(v=>String(v||'').trim())&&!confirm(uiText('Vorhandene Berichtsfelder durch den geprüften Vorschlag ersetzen? Die bisherigen Angaben bleiben im Verlauf erhalten.')))return;
 state.aiHistory=state.aiHistory||[];state.aiHistory.push({fields:structuredClone(state.fields),proposal:structuredClone(proposal),acceptedAt:new Date().toISOString()});
 state.fields={...state.fields,...Object.fromEntries(fields.filter(([key])=>key!=='betriebsstunden').map(([key])=>[key,proposal.fields[key].value]))};state.aiQuestions=proposal.questions;state.aiProposal=null;mark();aiMessage='Vorschlag übernommen. Bestätige den Bericht nach deiner abschließenden Kontrolle.';render();
}
function discardAiProposal(){state.aiProposal=null;mark();aiMessage='Vorschlag verworfen. Deine Berichtsfelder bleiben erhalten.';render()}
function restorePreviousReport(){const previous=state.aiHistory?.at(-1);if(!previous)return;const current=structuredClone(state.fields);state.fields=structuredClone(previous.fields);state.aiHistory.push({fields:current,restoredAt:new Date().toISOString()});mark();render()}
