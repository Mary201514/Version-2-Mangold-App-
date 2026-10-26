// Local command handling: no microphone service and no external AI request.
let draftTimer,dictationTimer,draftBase,dictationInstalled=false,draftConflict=false,transcriptEditActive=false;
function speechPanel(){return `<section class="panel" aria-label="Diktat korrigieren"><h2>Weiterreden, ergänzen oder korrigieren</h2><p>Schreibe oder diktiere im selben Textfeld weiter. Nach einer Pause werden vollständige Sätze zugeordnet. Ohne Satzende: „Neue Angaben zuordnen“ drücken.</p><p class="helper">Deutsche Befehle, zum Beispiel: „Ich korrigiere: Arbeitszeit drei Stunden.“ · „Füge noch hinzu: Probelauf erfolgreich.“ · „Ändere die Betriebsstunden auf 1.500.“</p><div class="actions"><button class="secondary" onclick="processDictation()">Neue Angaben zuordnen</button><button class="secondary" onclick="undoDictation()">Letzte Änderung rückgängig machen</button></div><div id="speech-feedback" role="status" aria-live="polite" data-no-translate>${esc(state.speechNotice||'Bereit. Deine Angaben werden fortlaufend als Entwurf auf diesem Gerät gespeichert.')}</div><div id="speech-questions">${speechQuestions()}</div><p class="helper">Lokale Zuordnung anhand eindeutiger Begriffe. Unklare Angaben bitte einem Abschnitt zuweisen. Die fachliche Kontrolle bleibt erforderlich.</p></section>`}
function speechQuestions(){const p=state.speechPending;if(!p)return '';return `<div class="ai-questions"><h3>Bitte Zuordnung klären</h3>${p.questions.map((q,i)=>`<div><p data-no-translate>${esc(q.prompt)}</p>${q.blocked?'':q.key?`<button class="secondary" onclick="resolveSpeech(${i},'${q.key}')">Änderung übernehmen</button>`:`<div class="actions">${Object.entries(MangoldDictation.labels).map(([key,label])=>`<button class="secondary" onclick="resolveSpeech(${i},'${key}')">${esc(label)}</button>`).join('')}</div>`}</div>`).join('')}<button class="secondary" onclick="discardSpeech()">Diese Zuordnung verwerfen</button><p>Bis zur Klärung bleiben sämtliche Berichtsfelder unverändert. Dein Diktat bleibt erhalten.</p></div>`}
function speechFeedback(message){state.speechNotice=message;const el=$('#speech-feedback');if(el)el.textContent=message;const q=$('#speech-questions');if(q)q.innerHTML=speechQuestions();toast(message)}
function speechSnapshot(){return structuredClone({fields:state.fields,adReport:state.adReport||'',completedAt:state.completedAt||null,checked:state.checked})}
function updateReportField(key,value){const previous=key==='adReport'?state.adReport:state.fields[key];if(previous===value)return;rememberSpeech();if(key==='adReport')state.adReport=value;else state.fields[key]=value;mark()}
function rememberSpeech(){state.speechHistory=state.speechHistory||[];state.speechHistory.push(speechSnapshot());if(state.speechHistory.length>50)state.speechHistory.shift()}
function commitSpeech(p){
 if(JSON.stringify(state.fields)!==p.base){speechFeedback('Berichtsfelder wurden inzwischen bearbeitet. Bitte die neue Zuordnung erneut starten.');state.speechPending=null;return}
 rememberSpeech();state.fields=MangoldDictation.apply(state.fields,p.ops);state.speechProcessed=p.source;state.speechPending=null;mark();
 const message=p.ops.map(op=>MangoldDictation.labels[op.key]+(op.mode==='replace'?' auf „'+op.value+'“ geändert.':' ergänzt.')).join(' ');
 speechFeedback(message||'Keine neue Angabe erkannt.');save(true);
}
function processDictation(){
 clearTimeout(dictationTimer);if(state.speechPending){speechFeedback('Bitte zuerst die offene Zuordnung klären oder verwerfen.');return}
 const source=state.text||'',previous=state.speechProcessed||'';
 if(!source.startsWith(previous)){speechFeedback('Der frühere Diktattext wurde bearbeitet und gespeichert. Bestehende Berichtsfelder bleiben erhalten. Korrigiere sie per Tastatur oder ergänze einen eindeutigen Korrekturbefehl am Textende.');state.speechProcessed=source;save(true);return}
 const addition=source.slice(previous.length).trim();if(!addition)return;
 const plan=MangoldDictation.plan(addition,state.fields);
 if(plan.action==='undo'){state.speechProcessed=source;undoDictation();return}
 if(plan.action==='complete'){state.speechProcessed=source;completeReport();return}
 const pending={...plan,source,base:JSON.stringify(state.fields)};
 if(plan.questions.length){state.speechPending=pending;mark();speechFeedback('Bitte kläre die Zuordnung. Bestehende Berichtsfelder bleiben unverändert.');save(true)}else commitSpeech(pending);
}
function resolveSpeech(index,key){const p=state.speechPending,q=p?.questions[index];if(!q||q.blocked)return;p.ops.push({key,value:q.value,mode:q.mode});p.questions.splice(index,1);if(p.questions.length){mark();speechFeedback('Zuordnung vorgemerkt. Bitte die übrigen Fragen klären.');save(true)}else commitSpeech(p)}
function discardSpeech(){const source=state.speechPending?.source;state.speechPending=null;if(source)state.speechProcessed=source;mark();speechFeedback('Zuordnung verworfen. Berichtsfelder unverändert; Diktat erhalten.');save(true)}
function undoDictation(){
 if(state.speechPending){discardSpeech();return}
 const old=state.speechHistory?.pop();if(!old){speechFeedback('Keine vorherige Änderung zum Wiederherstellen vorhanden.');save(true);return}
 Object.assign(state,old);mark();state.completedAt=old.completedAt;state.checked=old.checked;state.speechPending=null;state.speechNotice='Letzte Änderung rückgängig gemacht. Dein ursprüngliches Diktat bleibt erhalten.';save(true);render();toast(state.speechNotice);
}
function transcriptInput(input){if(!input.value.startsWith(state.text||'')&&state.text&&!transcriptEditActive){state.originalInputs=state.originalInputs||[];if(state.originalInputs.at(-1)!==state.text)state.originalInputs.push(state.text);transcriptEditActive=true}state.text=input.value;state.dictationCaret={start:input.selectionStart,end:input.selectionEnd};mark();clearTimeout(dictationTimer);if(/[.!?]\s*$/.test(input.value))dictationTimer=setTimeout(processDictation,2000)}
function originalVersions(){return state.originalInputs?.length?`<details><summary>Frühere ursprüngliche Eingaben ansehen</summary>${state.originalInputs.map(text=>`<div class="original" data-no-translate>${esc(text)}</div>`).join('')}</details>`:''}
function completionQuestions(){
 const questions=[...(state.aiQuestions||[])];if(state.speechPending)questions.push('Bitte die offene Zuordnung zuerst klären oder verwerfen.');
 if(state.text!==(state.speechProcessed||'')&&state.text?.trim())questions.push('Bitte neue Diktatangaben zuerst zuordnen.');
 const contents=Object.values(state.fields).join('\n')+'\n'+(state.adReport||'');
 if(/Probelauf (?:war )?erfolgreich/i.test(contents)&&/Probelauf (?:war )?(?:nicht erfolgreich|fehlgeschlagen)/i.test(contents))questions.push('War der Probelauf erfolgreich oder nicht erfolgreich? Bitte den Widerspruch in den betroffenen Feldern klären.');
 return questions;
}
function completeReport(){
 if(state.completedAt){toast('Dieser Demo-Bericht ist bereits abgeschlossen.');return}
 const questions=completionQuestions();if(questions.length){state.speechNotice=questions.join(' ');save(true);toast(state.speechNotice);if(location.hash!=='#pruefen')location.hash='pruefen';else render();return}
 rememberSpeech();state.completedAt=new Date().toISOString();state.checked=true;dirty=true;save(true);if(storageOK&&!draftConflict){render();toast('Demo-Bericht ausdrücklich abgeschlossen und auf diesem Gerät gespeichert.')}else{state.completedAt=null;state.checked=false;dirty=true}
}
function completionPanel(){return `<section class="panel"><h2>${state.completedAt?'Demo-Bericht abgeschlossen':'Bericht abschließen'}</h2><p>Vorerst keine Pflichtfelder. Leere Angaben bleiben offen und bedeuten weder „0“ noch „keine Mängel“. Offene Zuordnungen und erkannte Widersprüche müssen geklärt werden.</p>${speechQuestions()}${state.speechNotice?`<p data-no-translate>${esc(state.speechNotice)}</p>`:''}${completionQuestions().length?`<ul>${completionQuestions().map(q=>`<li data-no-translate>${esc(q)}</li>`).join('')}</ul>`:''}<p>${state.completedAt?'Abgeschlossen am '+esc(new Date(state.completedAt).toLocaleString('de-DE'))+'. Jede weitere Bearbeitung öffnet wieder einen Entwurf.':'Erst die Schaltfläche oder der separate Sprachbefehl „Bericht abschließen“ schließt diesen Demo-Bericht ab.'}</p><div class="actions"><button class="primary" onclick="completeReport()">Bericht abschließen</button><button class="secondary" onclick="undoDictation()">Letzte Änderung rückgängig machen</button></div>${state.adReport?'<p class="helper">Nach Änderungen an Berichtsfeldern den vollständigen Außendienstbericht ebenfalls prüfen. Er wird nicht automatisch überschrieben.</p>':''}</section>`}
function installDictation(){
 if(dictationInstalled)return;dictationInstalled=true;try{draftBase=localStorage.getItem('mangold-design-v1')}catch{draftBase=null}if(state.speechProcessed===undefined)state.speechProcessed=state.text||'';
 const originalMark=mark;mark=function(){originalMark();state.completedAt=null;clearTimeout(draftTimer);draftTimer=setTimeout(()=>save(true),350)};
 const originalSave=save;save=function(quiet=false){
  clearTimeout(draftTimer);let current;try{current=localStorage.getItem('mangold-design-v1')}catch{originalSave(quiet);return}
  if(current!==draftBase){draftConflict=true;storageOK=false;const el=$('#save-status');if(el)el.textContent='Speicher-Konflikt – Angaben nur in dieser Sitzung';toast('Ein anderer Tab hat diesen Entwurf geändert. Deine Angaben bleiben hier erhalten. Exportiere sie vor dem Neuladen; es wird nichts überschrieben.');return}
  originalSave(quiet);if(storageOK){draftBase=localStorage.getItem('mangold-design-v1');draftConflict=false}
 };
 const originalRender=render;render=function(){originalRender();const t=$('#transcript');if(t&&state.dictationCaret){t.setSelectionRange(Math.min(t.value.length,state.dictationCaret.start),Math.min(t.value.length,state.dictationCaret.end))}};
 const originalReset=resetForOrder;resetForOrder=function(order){save(true);if(!storageOK||draftConflict)return;clearTimeout(dictationTimer);originalReset(order);mark()};

 document.addEventListener('select',e=>{if(e.target.id==='transcript'){state.dictationCaret={start:e.target.selectionStart,end:e.target.selectionEnd};dirty=true;clearTimeout(draftTimer);draftTimer=setTimeout(()=>save(true),350)}});
 window.addEventListener('pagehide',()=>{if(dirty)save(true)});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty)save(true)});
 document.addEventListener('focusout',e=>{if(e.target.id==='transcript')transcriptEditActive=false});
 window.addEventListener('hashchange',()=>{clearTimeout(dictationTimer);if(dirty)save(true)});
 render();
}
