(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldAdProof=factory()})(this,function(){
 const labels={kunde_name:'Kunde',kunde_anschrift:'Kundenanschrift',kunde_ort:'PLZ / Ort',objekt:'Objekt / Anlage',objekt_anschrift:'Objektanschrift',ansprechp_vor_ort:'Ansprechpartner vor Ort',vorgangs_nr:'Vorgangsnummer',kunden_nr:'Kundennummer',auftrags_nr:'Auftragsnummer',datum:'Datum',termin:'Termin',bestell_nr:'Bestellnummer',kostenart:'Kostenart',auftrag:'Auftrag',kommission:'Kommission',zustellung:'Zustellung',reparaturgegenstand:'Reparaturgegenstand / Seriennummer',mitarbeiter:'Mitarbeiter',monteur:'Monteur',ansprechp:'Ansprechpartner',telefon:'Telefon',hersteller:'Hersteller / Bezeichnung',auftragstext:'Inspektion / Auftragstext',satz_monteur:'Verrechnungssatz Monteur',satz_ausloese:'Verrechnungssatz Auslöse',satz_km:'Verrechnungssatz je km',auftrag_erteilt:'Auftrag erteilt durch',ausgefuehrte_arbeiten:'Befund und ausgeführte Arbeiten',stunden:'Arbeitszeit / Stunden',reiseweg_km:'Reiseweg / km',reisezeit:'Reisezeit gesamt (nur falls bekannt)',unterschrift_kunde:'Unterschrift Kunde (nicht automatisch ausgefüllt)',kunde_druckschrift:'Kunde in Druckschrift',unterschrift_monteur:'Unterschrift Monteur (nicht automatisch ausgefüllt)',s2_vorgangs_nr:'Vorgangsnummer – Seite 2',s2_auftrags_nr:'Auftragsnummer – Seite 2',s2_ausgefuehrte_arbeiten:'Zusätzliche Arbeiten – Seite 2'};
 const sectionLabels={befund:'Befund / Zustand',arbeiten:'Ausgeführte Arbeiten',maengel:'Mängel / Besonderheiten',betriebsstunden:'Betriebsstunden'};
 function fieldLabel(name){if(labels[name])return labels[name];const material=name.match(/^(s2_)?mat_(\d+)_(stueck|art_nr|bezeichnung)$/);if(material)return 'Material '+(Number(material[2])+(material[1]?3:0))+' · '+({stueck:'Menge / Einheit',art_nr:'Artikelnummer',bezeichnung:'Bezeichnung'}[material[3]]);const time=name.match(/^zeit_(\d)_(\d)$/);if(time)return ['','Datum / Arbeitszeit von–bis','Monteur','Rüstzeit / Wartezeit','Reisezeit hin / rück'][Number(time[2])]+' · Zeile '+time[1];return name}
 const text=value=>value==null?'':String(value);
 function date(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.slice(8,10)+'.'+value.slice(5,7)+'.'+value.slice(0,4):text(value)}
 function materialRow(line){
  let rest=line.trim(),quantity='',article='';
  const q=rest.match(/^((?:\d+(?:[.,]\d+)?|ein|eine|einen|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\s+(?:Stück|Stk\.?|Meter|m|Liter|l|kg|g|Satz|Packung))\s+/i);
  if(q){quantity=q[1];rest=rest.slice(q[0].length)}
  const code=rest.match(/(?:,?\s*)(?:Artikelnummer|Artikel-Nr\.?|Art\.?-?Nr\.?)\s*:?\s*([\p{L}\p{N}][\p{L}\p{N}._\/-]*)\s*\.?$/iu);
  if(code){article=code[1];rest=rest.slice(0,code.index).trim().replace(/[,;]$/,'').trim()}
  return {stueck:quantity,art_nr:article,bezeichnung:rest||(!quantity&&!article?line:'')};
 }
 function automatic(state){
  const o=state.order||{},f=state.fields||{},v={kunde_name:text(o.customer),kunde_anschrift:text(o.customerAddress),kunde_ort:text(o.customerCity),objekt:text(o.plant),objekt_anschrift:text(o.address),ansprechp_vor_ort:text(o.contactOnSite),kunden_nr:text(o.customerNumber),auftrags_nr:text(o.id),vorgangs_nr:text(o.reference),datum:date(state.date),monteur:text(state.monteur),auftragstext:text(o.job),reparaturgegenstand:text(o.type||o.plant),hersteller:[o.manufacturer,o.serial?'Seriennummer: '+o.serial:''].filter(Boolean).join(' · '),stunden:text(f.arbeit),reiseweg_km:text(f.km),zeit_1_1:date(state.date),zeit_1_2:text(state.monteur),zeit_1_3:f.ruest?'Rüsten: '+f.ruest:'',zeit_2_3:f.warte?'Warten: '+f.warte:'',zeit_1_4:f.hin?'Hin: '+f.hin:'',zeit_2_4:f.rueck?'Rück: '+f.rueck:'',s2_auftrags_nr:text(o.id),s2_vorgangs_nr:text(o.reference)};
  v.ausgefuehrte_arbeiten=Object.entries(sectionLabels).filter(([key])=>text(f[key]).trim()).map(([key,label])=>label+':\n'+f[key]).join('\n\n');
  const materials=text(f.material).split(/\r?\n/).filter(line=>line.trim());
  for(let i=0;i<Math.min(materials.length,11);i++){const prefix=i<3?'mat_'+(i+1):'s2_mat_'+(i-2);for(const [key,value]of Object.entries(materialRow(materials[i])))v[prefix+'_'+key]=value}
  if(materials.length>11)v.s2_ausgefuehrte_arbeiten='Weiteres Material (wörtlich):\n'+materials.slice(11).join('\n');
  return v;
 }
 function values(state,record,template){const auto=automatic(state),result={};for(const field of template.fields)result[field.name]=Object.hasOwn(record?.adOverrides||{},field.name)?text(record.adOverrides[field.name]):text(auto[field.name]);return result}
 function filename(state){return ('AD-Nachweis-'+(state.order?.id||'Neuer-Einsatz')+'-'+(state.order?.customer||'Kunde')).replace(/[^\p{L}\p{N} ._-]/gu,'-')+'.pdf'}
 return {fieldLabel,automatic,values,materialRow,filename};
});
