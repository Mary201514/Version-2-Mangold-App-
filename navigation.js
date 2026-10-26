// Screen navigation and reversible protocol selection share the existing draft.
function jobKeyFor(order){return order.id||`${order.customer}|${order.plant}`}
resetForOrder=function(order){
  const key=jobKeyFor(order);protocolReturn='auftrag';
  state.jobDrafts=state.jobDrafts||{};
  if(state.jobSelected||state.savedAt||state.text||Object.keys(state.fields).length){
    state.jobDrafts[currentJobKey()]=structuredClone({order:state.order,text:state.text,fields:state.fields,checked:state.checked,date:state.date,monteur:state.monteur,savedAt:state.savedAt,aiProposal:state.aiProposal,aiHistory:state.aiHistory,aiQuestions:state.aiQuestions,reportLanguage:state.reportLanguage,adReport:state.adReport,businessPaste:state.businessPaste,businessCandidate:state.businessCandidate,businessHistory:state.businessHistory,speechHistory:state.speechHistory,speechProcessed:state.speechProcessed,speechPending:state.speechPending,speechNotice:state.speechNotice,dictationCaret:state.dictationCaret,completedAt:state.completedAt,originalInputs:state.originalInputs});
  }
  const draft=state.jobDrafts[key];
  if(draft)Object.assign(state,{aiProposal:null,aiHistory:[],aiQuestions:[],reportLanguage:'de',adReport:'',businessPaste:'',businessCandidate:null,businessHistory:[],speechHistory:[],speechProcessed:'',speechPending:null,speechNotice:'',dictationCaret:null,completedAt:null,originalInputs:[]},structuredClone(draft));
  else if(key!==currentJobKey()||!state.jobSelected)Object.assign(state,{order:structuredClone(order),text:'',fields:{},checked:false,savedAt:null,aiProposal:null,aiHistory:[],aiQuestions:[],reportLanguage:'de',adReport:'',businessPaste:'',businessCandidate:null,businessHistory:[],speechHistory:[],speechProcessed:'',speechPending:null,speechNotice:'',dictationCaret:null,completedAt:null,originalInputs:[]});
  state.jobSelected=true;
  dirty=true;
  if(location.hash==='#auftrag')render();else location.hash='auftrag';
};

home=function(){return previousHome()
  .replace('<a class="subtle" href="#entwuerfe">Meine Entwürfe →</a>',`<a class="choice new-ad-choice" href="#neu">${icon('plus')}<span><strong>Neuer AD erstellen</strong><small>Kunde und Anlage selbst auswählen</small></span><span class="arrow">›</span></a>`)};

headerSteps=function(active){return `<nav class="steps journey-steps" aria-label="Schritte im Auftrag">${[['auftrag','Auftrag'],['dokumentation','Dokumentation'],['pruefen','Prüfen']].map(([route,label],index)=>`<a href="#${route}" ${active===index+1?'aria-current="step"':''}><span class="step-number">${index+1}</span><strong>${label}</strong></a>`).join('<i aria-hidden="true">›</i>')}</nav>`};

const initialNewJob=newJob;
newJob=function(){return initialNewJob().replace('href="#einstieg">← Zurück','href="#start">← Startseite').replace('<select id="customer">','<select id="customer" onchange="state.pendingCustomer=this.value">').replace(/<option value="(\d+)"/g,(match,index)=>match+(String(state.pendingCustomer||'0')===index?' selected':''))};

jobProtocols=function(includeUnselected=false){return Object.values(state.protocols||{}).filter(p=>p.job===currentJobKey()&&(includeUnselected||p.selected!==false))};
function protocolForJob(templateId){return jobProtocols(true).find(p=>p.template===templateId)}
function selectProtocolForJob(templateId,selected){
  state.protocols=state.protocols||{};
  let record=protocolForJob(templateId);
  if(!record&&selected){const id=makeId();record={id,template:templateId,job:currentJobKey(),customer:state.order.customer,plant:state.order.plant,marks:[],savedAt:null};state.protocols[id]=record;}
  if(record)record.selected=selected;
  mark();return record;
}
function toggleProtocol(templateId,selected){const record=selectProtocolForJob(templateId,selected);const scroll=window.scrollY;render();window.scrollTo(0,scroll);if(record&&!selected)toast('Protokoll abgewählt. Deine Einträge bleiben erhalten.')}
attachProtocol=function(templateId){const record=selectProtocolForJob(templateId,true);openProtocol(record.id)};

attachedCards=function(){const records=jobProtocols();return records.length?`<div class="attached-list">${records.map(r=>`<div class="attached-card"><div><span class="selected-tag">✓ Ausgewählt</span><strong>${esc(protocolById(r.template).name)}</strong><small>${r.savedAt?'Auf diesem Gerät gespeichert':'Noch nicht gespeichert'} · ${esc(r.plant)}</small></div><div class="attached-actions"><button class="secondary" onclick="openProtocol('${r.id}')">Ausfüllen →</button><button class="deselect" onclick="toggleProtocol('${r.template}',false)">Abwählen</button></div></div>`).join('')}</div>`:''};

catalogResults=function(){const list=protocolCatalog.filter(p=>(protocolFilter.family==='Alle Anlagen'||p.families.includes(protocolFilter.family))&&(protocolFilter.category==='Alle Bereiche'||p.category===protocolFilter.category)&&p.name.toLocaleLowerCase('de').includes(protocolFilter.query.toLocaleLowerCase('de')));return `<p class="result-count">${list.length} ${list.length===1?'Vorlage':'Vorlagen'} · ${jobProtocols().length} ausgewählt</p><div class="protocol-grid">${list.map(p=>{const record=protocolForJob(p.id),selected=record&&record.selected!==false;return `<article class="protocol-card ${selected?'is-selected':''}"><img src="${p.pages[0].image}" alt="Vorschau: ${esc(p.name)}" loading="lazy"><div><span class="badge">${esc(p.category)}</span><h2>${esc(p.name)}</h2><p>${p.pages.length} ${p.pages.length===1?'Seite':'Seiten'} · ${p.families.map(esc).join(', ')}</p><label class="protocol-select"><input type="checkbox" ${selected?'checked':''} aria-label="${esc(p.name)} auswählen" onchange="toggleProtocol('${p.id}',this.checked)"><span>${selected?'Für diesen Auftrag ausgewählt':'Für diesen Auftrag auswählen'}</span></label>${record?.marks.length?'<small class="kept-entries">Deine bisherigen Einträge sind erhalten.</small>':''}<button class="${selected?'primary':'secondary'}" onclick="attachProtocol('${p.id}')">${selected?'Protokoll ausfüllen →':'Auswählen und ausfüllen →'}</button><a href="${p.pdf}" target="_blank" rel="noopener" class="template-link">Vorlage ansehen ↗</a></div></article>`}).join('')}</div>${list.length?'':'<div class="panel empty"><h2>Keine passende Vorlage gefunden</h2><p>Ändere den Anlagentyp oder den Suchbegriff.</p><button class="secondary" onclick="protocolFilter={family:\'Alle Anlagen\',category:\'Alle Bereiche\',query:\'\'};render()">Alle Vorlagen anzeigen</button></div>'}`};

const initialCatalog=catalogView;
catalogView=function(category){return initialCatalog(category)
 .replace("topBar('start','Startseite')",'')
 .replace('href="#start">← Startseite',`href="#${protocolReturn}">← ${protocolReturn==='dokumentation'?'Zur Dokumentation':'Zum Auftrag'}`)
 .replace('Wähle die passende Vorlage, füge sie zum Einsatz hinzu und fülle sie direkt aus.','Wähle die passenden Protokolle für diesen Auftrag. Du kannst sie jederzeit wieder abwählen.')};

function flowSettings(){
 const route=location.hash.slice(1)||'start';
 const map={
  start:{back:null,next:'einstieg',label:'Auftrag auswählen',hint:'Beginne mit deinem Einsatz'},
  einstieg:{back:'start',next:'auftraege',label:'Meine Aufträge',hint:'Auftrag öffnen oder neuen AD erstellen'},
  auftraege:{back:'einstieg',next:state.jobSelected||state.savedAt?'auftrag':null,label:'Zum ausgewählten Auftrag',hint:'Öffne deinen Auftrag in der Liste'},
  neu:{back:'start',action:'new',label:'Einsatz beginnen',hint:'Kunde und Anlage auswählen'},
  auftrag:{back:state.order.id?'auftraege':'neu',next:'dokumentation',label:'Dokumentation starten',hint:'Nächster Schritt'},
  dokumentation:{back:'auftrag',action:'review',label:'Angaben prüfen',hint:'Nächster Schritt'},
  pruefen:{back:'dokumentation',action:state.checked?'return':'confirm',label:state.checked?'Zur Auftragsübersicht':'Angaben geprüft bestätigen',hint:state.checked?'Deine Angaben sind bestätigt':'Nächster Schritt'},
  protokolle:{back:protocolReturn,action:'selection',label:protocolReturn==='dokumentation'?'Auswahl speichern · zur Dokumentation':'Auswahl speichern · zum Auftrag',hint:`${jobProtocols().length} Protokoll(e) ausgewählt`},
  formular:{back:'protokolle',action:'protocol',label:protocolReturn==='dokumentation'?'Speichern · zur Dokumentation':'Speichern · zum Auftrag',hint:'Protokoll bearbeiten'},
  inspektion:{back:'start',next:'einstieg',label:'Auftrag auswählen',hint:'Inspektion zum Auftrag'},
  entwuerfe:{back:'start',next:'auftrag',label:'Zum Auftrag',hint:'Entwurf weiterbearbeiten'}
 };return {route,...(map[route]||map.start)};
}
function flowNext(){
 const flow=flowSettings();if(flow.next){location.hash=flow.next;return}
 switch(flow.action){
  case 'new':$('#app form')?.requestSubmit();break;
  case 'review':review();break;
  case 'confirm':confirmReview();updateFlowNav();break;
  case 'return':location.hash='auftrag';break;
  case 'selection':{
   const records=jobProtocols(),old=records.map(r=>r.savedAt);
   records.forEach(r=>r.savedAt=new Date().toISOString());save();
   if(storageOK)location.hash=protocolReturn;else records.forEach((r,i)=>r.savedAt=old[i]);
   break;
  }
  case 'protocol':if(protocolRecord()){saveProtocol();if(storageOK)location.hash=protocolReturn}break;
 }
}
function updateFlowNav(){let nav=$('#flow-nav');if(!nav){nav=document.createElement('nav');nav.id='flow-nav';nav.className='flow-nav';nav.setAttribute('aria-label','Vor und zurück');document.body.append(nav)}const flow=flowSettings();nav.innerHTML=`<button class="secondary flow-back" ${!flow.back?'disabled':''} onclick="location.hash='${flow.back||'start'}'">← Zurück</button><div class="flow-position"><span>${esc(flow.hint)}</span><small>Deine Eingaben bleiben beim Wechsel erhalten.</small></div><button class="primary flow-next" ${!flow.next&&!flow.action?'disabled':''} onclick="flowNext()">${esc(flow.label)} <span aria-hidden="true">→</span></button>`}
const renderWithProtocols=render;
render=function(){renderWithProtocols();updateFlowNav()};
const refreshEditorBeforeFlow=refreshProtocolEditor;
refreshProtocolEditor=function(){refreshEditorBeforeFlow();updateFlowNav()};
render();
