(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldDictation=factory()})(this,function(){
 const labels={befund:'Befund',arbeiten:'Ausgeführte Arbeiten',material:'Material',arbeit:'Arbeitszeit',ruest:'Rüstzeit',warte:'Wartezeit',hin:'Reisezeit hin',rueck:'Reisezeit rück',km:'Gefahrene Kilometer',maengel:'Mängel und Besonderheiten',betriebsstunden:'Betriebsstunden'};
 const names='Befund(?: / Zustand der Anlage)?|Zustand(?: der Anlage)?|Fehlerbericht|Ausgeführte (?:Arbeiten|Tätigkeiten)|Arbeiten|Material|Arbeitszeit|Rüstzeit|Wartezeit|Reisezeit hin|Reisezeit (?:rück|zurück)|Kilometer|Gefahrene Kilometer|km|Mängel(?: und Besonderheiten)?|Besonderheiten|Betriebsstunden';
 function keyFor(label){const s=label.toLocaleLowerCase('de');return /^(befund|zustand|fehlerbericht)/.test(s)?'befund':/^(ausgeführte|arbeiten)/.test(s)?'arbeiten':/^material/.test(s)?'material':/^arbeitszeit/.test(s)?'arbeit':/^rüst/.test(s)?'ruest':/^warte/.test(s)?'warte':/reisezeit hin/.test(s)?'hin':/^reisezeit/.test(s)?'rueck':/^(kilometer|gefahrene|km)/.test(s)?'km':/^betriebsstunden/.test(s)?'betriebsstunden':'maengel'}
 function clean(s){return s.trim().replace(/[.!;]+$/,'').trim()}
 function plan(text,current){
  const input=text.trim();if(/^letzte Änderung rückgängig machen[.!]?$/i.test(input))return {action:'undo',ops:[],questions:[]};
  if(/^bericht abschließen[.!]?$/i.test(input))return {action:'complete',ops:[],questions:[]};
  const split=new RegExp('(?<=[.!?])\\s+|;\\s*|,\\s*(?=(?:'+names+'|Ich korrigiere|Ich meinte|Füge|Ergänze|Ändere)\\b)','i');
  const explicit=new RegExp('^(?:die |den |das |beim |bei den |bei der )?('+names+')(?:\\s+auf\\b|\\s*[:–-]\\s*|\\s+)([\\s\\S]+)$','i');
  const ops=[],questions=[];
  const separated=input.replace(/\s+(?=(?:Ausgeführte (?:Arbeiten|Tätigkeiten)|Arbeitszeit|Rüstzeit|Wartezeit|Reisezeit hin|Reisezeit rück|Reisezeit zurück|Kilometer|Betriebsstunden|Material)\b)/gi,(space,offset,all)=>{const before=all.slice(0,offset);return /(?:ich korrigiere:?|ich meinte|ändere(?: die| den| das)?|ergänze(?: beim| bei der)?|füge (?:noch )?hinzu:?|außerdem|[,.;:])$/i.test(before.trim())?space:', '});
  for(const original of separated.split(split).filter(s=>s.trim())){
   let phrase=clean(original),mode='add';
   if(/^(ich korrigiere|ich meinte|ändere)\b/i.test(phrase)){mode='replace';phrase=phrase.replace(/^(?:ich korrigiere|ich meinte|ändere)\s*:?\s*/i,'')}
   phrase=phrase.replace(/^(?:füge (?:noch )?hinzu|außerdem|ergänze)\s*:?\s*/i,'');
   const match=phrase.match(explicit);let key,value;
   if(match){key=keyFor(match[1]);value=clean(match[2])}
   else {value=phrase;if(mode==='add'){
    const work=/\b(geprüft|gewechselt|ersetzt|gereinigt|zerlegt|montiert|demontiert|repariert)\b|\bProbelauf\b/i.test(value);
    const finding=/\b(undicht|defekt|verstopft|beschädigt|korrodiert)\b/i.test(value);
    if(work&&!finding)key='arbeiten';else if(finding&&!work)key='befund';
   }}
   if(!value)continue;
   if(!key){questions.push({value,mode,prompt:'Wo soll „'+value+'“ '+(mode==='replace'?'geändert':'ergänzt')+' werden?'});continue}
   if(!['befund','arbeiten','material','maengel'].includes(key)&&mode==='add'&&String(current[key]||'').trim()&&current[key]!==value){questions.push({key,value,mode:'replace',prompt:labels[key]+' ist bereits „'+current[key]+'“. Durch „'+value+'“ ersetzen?'});continue}
   ops.push({key,value,mode:mode==='replace'||!['befund','arbeiten','material','maengel'].includes(key)?'replace':'add'});
  }
  const seen={};for(const op of ops){if(seen[op.key]&&op.mode==='replace'&&seen[op.key]!==op.value)questions.push({blocked:true,prompt:'Mehrere unterschiedliche Angaben für '+labels[op.key]+'. Bitte eine eindeutige Korrektur diktieren.'});seen[op.key]=op.value}
  return {action:'edit',ops,questions};
 }
 function apply(current,ops){const result={...current};for(const op of ops){if(!Object.hasOwn(labels,op.key)||!['add','replace'].includes(op.mode))throw Error('INVALID_OPERATION');result[op.key]=op.mode==='replace'||!String(result[op.key]||'').trim()?op.value:String(result[op.key]).trim()+'\n'+op.value}return result}
 return {labels,plan,apply};
});
