// Browser speech recognition and filling the original Außendienst-Nachweis V4.
// Extraction is local and rule based. Unassigned text stays in the report.
const reportExtraFields = [
  ['kunde_name','Kunde'], ['kunde_anschrift','Kundenanschrift'], ['kunde_ort','PLZ / Ort'],
  ['objekt','Objekt / Anlage'], ['objekt_anschrift','Objektanschrift'],
  ['ansprechp_vor_ort','Ansprechpartner vor Ort'], ['telefon','Telefon'],
  ['kunden_nr','Kunden-Nr.'], ['auftrags_nr','Auftrags-Nr.'], ['vorgangs_nr','Vorgangs-Nr.'],
  ['bestell_nr','Bestell-Nr.'], ['hersteller','Hersteller / Bezeichnung']
];
const speechCapture = {recognition:null, active:false, pending:false, base:'', final:'', interim:'', job:null};
let reportUrl = null, reportBuildId = 0;

function speechAvailable(){return !!(window.SpeechRecognition || window.webkitSpeechRecognition)}
function speechStatus(text){const el=document.querySelector('#speech-status');if(el)el.textContent=text}
function refreshSpeechButton(){
  const button=document.querySelector('#speech-record');
  if(!button)return;
  button.setAttribute('aria-pressed',String(speechCapture.active));
  button.disabled=speechCapture.pending;
  button.querySelector('span').innerHTML=speechCapture.active?'Spracheingabe beenden<small>Das Gesprochene wird als Text übernommen</small>':'Spracheingabe starten<small>Deutsch · Angaben für dein Außendienstformular</small>';
  const input=document.querySelector('#transcript');if(input)input.readOnly=speechCapture.active||speechCapture.pending;
}
function stopSpeech(){
  if(!speechCapture.recognition||speechCapture.pending)return;
  speechCapture.pending=true;refreshSpeechButton();
  speechCapture.recognition.stop();
}
function toggleSpeech(){
  if(speechCapture.active){stopSpeech();return}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){speechStatus('Dieser Browser unterstützt keine direkte Spracherkennung. Nutze die Mikrofontaste deiner Tablet-Tastatur im Textfeld oder tippe deine Angaben.');return}
  const recognition=new Recognition();
  recognition.lang='de-DE';recognition.continuous=true;recognition.interimResults=true;
  Object.assign(speechCapture,{recognition,active:true,pending:false,base:state.text.trim(),final:'',interim:'',job:state.order.id||`${state.order.customer}|${state.order.plant}`});
  recognition.onresult=event=>{
    const currentJob=state.order.id||`${state.order.customer}|${state.order.plant}`;
    if(currentJob!==speechCapture.job)return;
    let final='',interim='';
    for(let i=0;i<event.results.length;i++){
      const result=event.results[i];
      if(result.isFinal)final+=result[0].transcript+' ';else interim+=result[0].transcript+' ';
    }
    speechCapture.final=final.trim();speechCapture.interim=interim.trim();
    state.text=[speechCapture.base,speechCapture.final].filter(Boolean).join('\n');mark();
    const input=document.querySelector('#transcript');if(input)input.value=state.text;
    speechStatus(interim?'Wird erkannt: '+interim:'Zuhören … sprich weiter oder beende die Spracheingabe.');
  };
  recognition.onerror=event=>{
    const messages={'not-allowed':'Mikrofonzugriff wurde nicht erlaubt. Erlaube ihn im Browser oder nutze das Textfeld.','audio-capture':'Kein Mikrofon verfügbar. Prüfe dein Mikrofon oder nutze das Textfeld.','network':'Der Spracherkennungsdienst ist nicht erreichbar. Bereits erfasster Text bleibt erhalten.','no-speech':'Keine Sprache erkannt. Versuche es erneut oder nutze das Textfeld.'};
    speechStatus(messages[event.error]||'Spracheingabe unterbrochen. Bereits erfasster Text bleibt erhalten.');
    speechCapture.error=true;
  };
  recognition.onend=()=>{
    speechCapture.active=false;speechCapture.pending=false;speechCapture.recognition=null;refreshSpeechButton();
    if((location.hash==='#pruefen'||location.hash==='#nachweis')&&state.text.trim()){
      assignServiceTranscript();render();
    }
    if(!speechCapture.error)speechStatus(speechCapture.interim?'Die letzten Wörter wurden nicht bestätigt. Prüfe deinen Text und ergänze fehlende Angaben.':'Spracheingabe beendet. Deine Angaben können jetzt ins Formular übernommen werden.');
  };
  speechCapture.error=false;refreshSpeechButton();speechStatus('Mikrofon wird gestartet …');
  try{recognition.start()}catch(error){speechCapture.active=false;speechCapture.recognition=null;refreshSpeechButton();speechStatus('Die Spracheingabe konnte nicht starten. Prüfe Mikrofonfreigabe und Browserunterstützung.')}
}
window.addEventListener('hashchange',()=>{if(speechCapture.active)stopSpeech();if(location.hash!=='#nachweis'){reportBuildId++;if(reportUrl){URL.revokeObjectURL(reportUrl);reportUrl=null}}});

const reportLabels = [
  ['ansprechp_vor_ort','Ansprechpartner(?:in)?(?: vor Ort)?|Kontaktperson'],
  ['kunde_anschrift','Kundenanschrift|Kundenadresse'], ['objekt_anschrift','Objektanschrift|Einsatzadresse'],
  ['kunde_ort','Postleitzahl(?: und Ort)?|PLZ(?: und Ort)?|Kundenort'],
  ['kunde_name','Kundenname|Kunde'], ['objekt','Objekt|Anlage'],
  ['kunden_nr','Kundennummer|Kunden[- ]?Nr\\.?'], ['auftrags_nr','Auftragsnummer|Auftrags[- ]?Nr\\.?'],
  ['vorgangs_nr','Vorgangsnummer|Vorgangs[- ]?Nr\\.?'], ['bestell_nr','Bestellnummer|Bestell[- ]?Nr\\.?'],
  ['hersteller','Hersteller(?: und Bezeichnung)?'], ['telefon','Telefon(?:nummer)?'],
  ['monteur','Monteur(?:in)?'], ['datum','Einsatzdatum|Datum'],
  ['befund','Befund|Zustand(?: der Anlage)?'],
  ['arbeiten','Ausgeführte Arbeiten|Durchgeführte Arbeiten|Arbeiten'],
  ['material','Materialeinsatz|Material'], ['ruest','Rüstzeit'], ['warte','Wartezeit'],
  ['hin','Reisezeit hin|Hinfahrt(?:szeit)?|Anfahrt(?:szeit)?'],
  ['rueck','Reisezeit (?:rück|zurück)|Rückfahrt(?:szeit)?'],
  ['arbeit','Arbeitszeit|Arbeitsdauer'], ['km','Gefahrene Kilometer|Kilometer|Fahrstrecke'],
  ['maengel','Mängel(?: und Besonderheiten)?|Besonderheiten']
];
function parseServiceTranscript(text){
  const result={};
  const pattern=reportLabels.map(([key,label])=>`(?<${key}>${label})`).join('|');
  // Labels can be spoken without punctuation; boundaries avoid matching word fragments.
  const matcher=new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])\\s*(?::|ist|beträgt|waren|war)?\\s*`,'giu');
  const matches=[...text.matchAll(matcher)].filter(match=>{
    // "62 Kilometer gefahren" is a distance, not the start of a labeled field.
    if(match.groups.km!==undefined&&/\d\s*$/.test(text.slice(0,match.index)))return false;
    return true;
  });
  const clean=value=>value.trim().replace(/^[,;:\s]+|[,;:\s]+$/g,'').trim();
  function append(key,value){value=clean(value);if(value)result[key]=[result[key],value].filter(Boolean).join('\n')}
  if(matches.length){
    append('unzugeordnet',text.slice(0,matches[0].index));
    matches.forEach((match,i)=>{
      const key=Object.keys(match.groups).find(k=>match.groups[k]!==undefined);
      append(key,text.slice(match.index+match[0].length,matches[i+1]?.index??text.length));
    });
  }else{
    // Conservative free-speech extraction: only clear time/distance clauses are assigned.
    const clauses=text.split(/(?<=[.!?;])\s+|\n+/).filter(Boolean);
    for(const clause of clauses){
      let match;
      if((match=clause.match(/(?:\b)([\wäöüß,.: -]+?)\s+(?:Stunden?|Minuten?)\s+(?:gearbeitet|Arbeitszeit)\b/i)))append('arbeit',match[0].replace(/\s+(?:gearbeitet|Arbeitszeit)\b.*/i,''));
      else if((match=clause.match(/(?:insgesamt\s+)?(\d+(?:[,.]\d+)?)\s*(?:km|Kilometer)\s+(?:gefahren|Fahrstrecke)/i)))append('km',match[1]+' km');
      append('unzugeordnet',clause);
    }
  }
  return result;
}
function assignServiceTranscript(){
  if(state.fields._sourceText===state.text)return;
  const extracted=parseServiceTranscript(state.text);
  // Original text remains available; ambiguous statements are never invented or discarded.
  const existingWithoutSource=!Object.hasOwn(state.fields,'_sourceText')&&Object.keys(state.fields).length>0;
  const contextFields=new Set([...reportExtraFields.map(([key])=>key),'datum','monteur']);
  for(const [key] of [...fields,...reportExtraFields,['datum'],['monteur'],['unzugeordnet']]){
    if(existingWithoutSource&&Object.hasOwn(state.fields,key))continue;
    if(Object.hasOwn(extracted,key))state.fields[key]=extracted[key];
    else if(contextFields.has(key))delete state.fields[key];
    else state.fields[key]='';
  }
  state.fields._sourceText=state.text;mark();
}
function reportDetailsEditor(){
  return `<details class="panel report-extra"><summary>Kunden- und Auftragsdaten im Formular prüfen</summary><div class="form-grid review-fields">${reportExtraFields.map(([key,label])=>`<div class="field"><label for="report-${key}">${esc(label)}</label><input id="report-${key}" value="${esc(reportValue(key))}" oninput="state.fields['${key}']=this.value;mark()"></div>`).join('')}</div><div class="form-grid"><div class="field"><label for="report-datum">Einsatzdatum</label><input id="report-datum" value="${esc(reportValue('datum'))}" oninput="state.fields.datum=this.value;mark()"></div><div class="field"><label for="report-monteur">Monteur</label><input id="report-monteur" value="${esc(reportValue('monteur'))}" oninput="state.fields.monteur=this.value;mark()"></div></div></details>`;
}
function reportValue(key){
  if(Object.hasOwn(state.fields,key))return state.fields[key];
  return reportDefaultValue(key);
}
function reportDefaultValue(key){
  const date=state.date?state.date.split('-').reverse().join('.'):'';
  return ({kunde_name:state.order.customer,objekt:state.order.plant,objekt_anschrift:state.order.address,auftrags_nr:state.order.id,datum:date,monteur:state.monteur})[key]||'';
}
function durationMinutes(value){
  const words={'null':0,'eine':1,'einer':1,'einen':1,'einem':1,'ein':1,'eins':1,'zwei':2,'drei':3,'vier':4,'fünf':5,'sechs':6,'sieben':7,'acht':8,'neun':9,'zehn':10,'elf':11,'zwölf':12,'fünfzehn':15,'zwanzig':20,'dreißig':30,'vierzig':40,'fünfundvierzig':45};
  let text=value.toLowerCase().replace(/anderthalb/g,'1,5').replace(/eineinhalb/g,'1,5').replace(/(?:eine?\s+)?halbe?\s+stunde/g,'0,5 Stunden');
  text=text.replace(/\b[\p{L}]+\b/gu,w=>Object.hasOwn(words,w)?String(words[w]):w);
  const range=text.match(/(?:von\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\s*(?:bis|–|-)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?/);
  if(range&&(/uhr/i.test(text)||range[2]!==undefined||range[4]!==undefined)){
    const start=Number(range[1])*60+Number(range[2]||0),end=Number(range[3])*60+Number(range[4]||0);
    if(Number(range[1])>23||Number(range[3])>23||Number(range[2]||0)>59||Number(range[4]||0)>59||end<start)return null;
    return end-start;
  }
  const parts=[...text.matchAll(/(\d+(?:[,.]\d+)?)\s*(stunden?|std\.?|h|minuten?|min\.?)\b/gi)];
  if(!parts.length)return null;
  return parts.reduce((sum,m)=>sum+Number(m[1].replace(',','.'))*(/^(?:s|h)/i.test(m[2])?60:1),0);
}
function hoursText(minutes){return String(Math.round(minutes/60*100)/100).replace('.',',')}
function materialRows(raw){
  return raw.split(/\n|;|\s+und\s+(?=\d+\s)/i).map(s=>s.trim().replace(/[.;]+$/,'')).filter(Boolean).map(line=>{
    const amount=line.match(/^(\d+(?:[,.]\d+)?|ein(?:e|en)?|zwei|drei|vier|fünf)\s+(?:(Stück|Stk\.?|Meter|m|Liter|l|kg)\s+)?/i);
    const article=line.match(/(?:Artikelnummer|Artikel[- ]?Nr\.?|Art\.?[- ]?Nr\.?)\s*:?\s*([\w-]+)/i);
    const description=line.replace(amount?.[0]||/^$/,'').replace(article?.[0]||/^$/,'').replace(/^[,\s]+|[,\s]+$/g,'');
    return {amount:amount?amount[1]+(amount[2]?' '+amount[2]:''):'',article:article?.[1]||'',description:description||line};
  });
}
function wrapReportText(text,font,size,width){
  const lines=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      if(font.widthOfTextAtSize(word,size)>width)throw Error('Ein Wort oder eine Nummer ist zu lang für das Formular. Bitte füge im betreffenden Eintrag Leerzeichen oder Zeilenumbrüche ein.');
      const candidate=line?line+' '+word:word;
      if(line&&font.widthOfTextAtSize(candidate,size)>width){lines.push(line);line=word}else line=candidate;
    }
    lines.push(line);
  }
  return lines;
}
function reportFieldLabel(name){
  const labels={...Object.fromEntries(reportExtraFields),datum:'Einsatzdatum',monteur:'Monteur',reparaturgegenstand:'Objekt / Anlage',auftragstext:'Auftragsbeschreibung',zeit_1_1:'Datum / Arbeitszeit',zeit_1_2:'Monteur',zeit_1_3:'Rüstzeit',zeit_2_3:'Wartezeit',zeit_1_4:'Reisezeit hin',zeit_2_4:'Reisezeit rück',reiseweg_km:'Gefahrene Kilometer',reisezeit:'Reisezeit',stunden:'Arbeitsstunden'};
  if(/mat_\d+/.test(name))return 'Material · Menge, Artikelnummer oder Bezeichnung';
  return labels[name]||'Auftragsdaten';
}
async function createServiceReport(){
  const response=await fetch('assets/service-report/aussendienst-v4.pdf');
  if(!response.ok)throw Error('Die Außendienstvorlage konnte nicht geladen werden. Bitte versuche es erneut.');
  const doc=await PDFLib.PDFDocument.load(await response.arrayBuffer());
  const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const values={};
  for(const [key] of reportExtraFields)values[key]=String(reportValue(key));
  Object.assign(values,{datum:reportValue('datum'),monteur:reportValue('monteur'),reparaturgegenstand:reportValue('objekt'),auftragstext:state.order.job||'',s2_auftrags_nr:reportValue('auftrags_nr'),s2_vorgangs_nr:reportValue('vorgangs_nr')});
  const narrative=[state.fields.befund&&'Befund: '+state.fields.befund,state.fields.arbeiten&&'Arbeiten: '+state.fields.arbeiten,state.fields.maengel&&'Mängel / Besonderheiten: '+state.fields.maengel,state.fields.unzugeordnet&&'Weitere Angaben (Zuordnung prüfen): '+state.fields.unzugeordnet].filter(Boolean).join('\n');
  const materials=materialRows(state.fields.material||'');
  if(materials.length>11)throw Error('Die Vorlage hat Platz für elf Materialpositionen. Bitte fasse Positionen zusammen oder kürze die Materialliste; es wurde nichts abgeschnitten.');
  materials.forEach((row,i)=>{const prefix=i<3?`mat_${i+1}`:`s2_mat_${i-2}`;values[prefix+'_stueck']=row.amount;values[prefix+'_art_nr']=row.article;values[prefix+'_bezeichnung']=row.description});
  const narrativeLines=wrapReportText(narrative,font,10,507);
  if(narrativeLines.length>37)throw Error('Der Bericht ist länger als die beiden Formularseiten. Bitte kürze die Angaben; es wurde nichts abgeschnitten.');
  values.ausgefuehrte_arbeiten=narrativeLines.slice(0,7).join('\n');
  values.s2_ausgefuehrte_arbeiten=narrativeLines.slice(7).join('\n');
  values.zeit_1_1=[reportValue('datum'),state.fields.arbeit].filter(Boolean).join(' · ');
  values.zeit_1_2=reportValue('monteur');
  values.zeit_1_3=state.fields.ruest?'Rüst: '+state.fields.ruest:'';
  values.zeit_2_3=state.fields.warte?'Warte: '+state.fields.warte:'';
  values.zeit_1_4=state.fields.hin?'Hin: '+state.fields.hin:'';
  values.zeit_2_4=state.fields.rueck?'Rück: '+state.fields.rueck:'';
  const work=durationMinutes(state.fields.arbeit||'');
  values.stunden=work===null?'':hoursText(work);
  values.reiseweg_km=(state.fields.km||'').replace(/\s*(km|Kilometer)[.\s]*$/i,'');
  const outward=durationMinutes(state.fields.hin||''),backward=durationMinutes(state.fields.rueck||'');
  values.reisezeit=outward!==null&&backward!==null?hoursText(outward+backward):'';
  const layout=[];const form=doc.getForm();
  for(const [pageIndex,page] of serviceReportTemplate.entries()){
    const entries=[];
    for(const spec of page.fields){
      let value=String(values[spec.name]??form.getTextField(spec.name).getText()??'');
      if(!value)continue;
      // No fabricated acceptance, signatures, prices, or missing measurements.
      const [x,y,right,bottom]=spec.rect;
      const width=right-x-4,height=bottom-y-3;
      const multiline=/ausgefuehrte_arbeiten/.test(spec.name);
      if(!multiline)value=value.replace(/\n/g,'; ');
      let size=10;
      const minimumSize=spec.name.startsWith('fuss_')?6:7;
      font.encodeText(value.replace(/\n/g,' '));
      if(!multiline){while(size>minimumSize&&(font.widthOfTextAtSize(value,size)>width||size*1.2>height))size-=.25;
        if(font.widthOfTextAtSize(value,size)>width)throw Error('Der Eintrag „'+reportFieldLabel(spec.name)+'“ passt nicht lesbar ins Formular. Bitte kürze ihn in der Prüfansicht.');
      }
      const lines=multiline?value.split('\n'):[value.replace(/\n/g,' ')];
      if(lines.length*size*1.2>height)throw Error('Der Text passt nicht ins Formular. Bitte kürze den betreffenden Eintrag.');
      // Draw the same layout in the PDF and in the tablet-compatible preview.
      // Printed values do not depend on PDF viewer widget rendering/length limits.
      const pdfPage=doc.getPage(pageIndex);
      pdfPage.drawRectangle({x,y:page.height-bottom,width:right-x,height:bottom-y,color:PDFLib.rgb(1,1,1)});
      lines.forEach((line,i)=>pdfPage.drawText(line,{x:x+2,y:page.height-y-2-size-i*size*1.2,size,font,color:PDFLib.rgb(.05,.15,.3)}));
      entries.push({name:spec.name,value:lines.join('\n'),x:x+2,y:y+2,width,height,size});
    }
    layout.push(entries);
  }
  // Printed PDF values come from the explicit layout above, with no viewer dependency.
  for(const field of form.getFields())form.removeField(field);
  return {bytes:await doc.save(),layout,values};
}
function reportPage(){return topBar('pruefen','Angaben bearbeiten')+headerSteps(4)+`<p class="eyebrow">Dein ausgefülltes Formular</p><h1>Außendienst-Nachweis</h1><p class="intro">Deine Angaben in der Originalvorlage. Prüfe beide Seiten vor der Weitergabe.</p><div id="report-result" role="status" aria-live="polite"><p>Formular wird ausgefüllt …</p></div>`}
async function prepareServiceReport(){
  const id=++reportBuildId;
  if(reportUrl){URL.revokeObjectURL(reportUrl);reportUrl=null}
  try{
    const report=await createServiceReport();
    if(id!==reportBuildId||location.hash!=='#nachweis')return;
    reportUrl=URL.createObjectURL(new Blob([report.bytes],{type:'application/pdf'}));
    const name=('Aussendienst-Nachweis-'+(reportValue('auftrags_nr')||'Entwurf')).replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf';
    document.querySelector('#report-result').innerHTML=`<div class="actions report-actions"><a class="primary" href="${reportUrl}" download="${name}">Ausgefülltes PDF herunterladen</a><a class="secondary" href="${reportUrl}" target="_blank" rel="noopener">PDF öffnen / drucken</a><a class="secondary" href="#pruefen">Angaben korrigieren</a></div><p class="helper">Unterschriften und nicht erfasste Angaben bleiben leer. Noch keine Abnahme oder Übertragung.</p><div class="report-pages">${serviceReportTemplate.map((page,i)=>`<section aria-label="Außendienstformular Seite ${i+1}" class="report-sheet"><img src="assets/service-report/page-${i+1}.png" alt="Originalvorlage Außendienst-Nachweis, Seite ${i+1}">${report.layout[i].map(entry=>`<span class="report-entry" data-field="${entry.name}" style="left:${entry.x/page.width*100}%;top:${entry.y/page.height*100}%;width:${entry.width/page.width*100}%;height:${entry.height/page.height*100}%;font-size:${entry.size/page.width*100}cqw">${esc(entry.value)}</span>`).join('')}</section>`).join('')}</div>`;
  }catch(error){
    if(id!==reportBuildId||location.hash!=='#nachweis')return;
    const message=/WinAnsi/.test(error.message)?'Ein Zeichen wird in dieser PDF-Schrift nicht unterstützt. Bitte ersetze Sonderzeichen oder Emojis in der Prüfansicht.':error.message;
    document.querySelector('#report-result').innerHTML=`<div class="panel" role="alert"><h2>Formular konnte noch nicht erstellt werden</h2><p>${esc(message)}</p><p>Deine Angaben bleiben erhalten.</p><a class="primary" href="#pruefen">Angaben bearbeiten</a><button class="secondary" onclick="prepareServiceReport()">Erneut versuchen</button></div>`;
  }
}
