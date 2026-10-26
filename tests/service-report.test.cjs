const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function load(){
  const context=vm.createContext({window:{addEventListener(){}},state:{order:{id:'AD-42',customer:'Kundin GmbH',plant:'Pumpe'},date:'2026-10-26',monteur:'Maria',fields:{},text:''},fields:[['befund'],['arbeiten'],['material'],['arbeit'],['hin'],['rueck'],['km']],mark(){}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../service-report.js'),'utf8'),context);
  return context;
}
const c=load();
test('Gesprochene Angaben werden ohne ein festes Demobeispiel zugeordnet',()=>{
  const values=c.parseServiceTranscript('Kunde: Müller GmbH. Befund: Motor läuft nicht. Arbeiten: Lager getauscht. Material: 2 Stück Lager, Artikelnummer L-17. Arbeitszeit: drei Stunden. Rüstzeit: 10 Minuten. Reisezeit hin: 20 Minuten. Reisezeit rück: 25 Minuten. Kilometer: 37 km.');
  assert.equal(values.kunde_name,'Müller GmbH.');
  assert.equal(values.arbeiten,'Lager getauscht.');
  assert.equal(values.material,'2 Stück Lager, Artikelnummer L-17.');
  assert.equal(values.arbeit,'drei Stunden.');
  assert.equal(values.hin,'20 Minuten.');
  assert.equal(values.rueck,'25 Minuten.');
  assert.equal(values.km,'37 km.');
});
test('Mehrdeutige Angaben bleiben im Bericht und werden nicht erfunden',()=>{
  const values=c.parseServiceTranscript('Beim Kunden hat es stark geregnet. Bitte nächsten Dienstag nochmals anrufen.');
  assert.match(values.unzugeordnet,/stark geregnet/);
  assert.match(values.unzugeordnet,/Dienstag/);
  assert.equal(values.arbeit,undefined);
});
test('Wiederholte Angaben gehen nicht verloren, Doppelpunkte sind optional',()=>{
  const values=c.parseServiceTranscript('Befund Pumpe verstopft. Arbeiten Pumpe gereinigt. Arbeiten Dichtung ersetzt.');
  assert.equal(values.arbeiten,'Pumpe gereinigt.\nDichtung ersetzt.');
});
test('Dauerangaben und Uhrzeitbereiche werden in Minuten umgerechnet',()=>{
  for(const [input,expected] of [['zwei Stunden',120],['1,5 Stunden',90],['eine Stunde und 30 Minuten',90],['eine halbe Stunde',30],['45 Minuten',45],['von 08:15 bis 10:45 Uhr',150],['von acht Uhr bis zehn Uhr',120],['von 23:00 bis 01:00 Uhr',null],['unbekannt',null]])assert.equal(c.durationMinutes(input),expected,input);
});
test('Materialmenge, Artikelnummer und Bezeichnung werden getrennt',()=>{
  const rows=c.materialRows('1 Stück Dichtung, Artikelnummer D-204.\n2 Meter Kabel, Art.-Nr.: K-2; eine Dichtung');
  assert.equal(rows.length,3);
  assert.equal(rows[0].amount,'1 Stück');assert.equal(rows[0].article,'D-204');assert.equal(rows[0].description,'Dichtung');
  assert.equal(rows[1].amount,'2 Meter');assert.equal(rows[1].article,'K-2');assert.equal(rows[1].description,'Kabel');
  assert.equal(rows[2].amount,'eine');assert.equal(rows[2].description,'Dichtung');
});
test('Erneutes Prüfen desselben Textes erhält manuelle Korrekturen',()=>{
  const context=load();context.state.text='Befund: Defekt. Arbeitszeit: 2 Stunden.';
  context.assignServiceTranscript();context.state.fields.arbeit='3 Stunden';context.assignServiceTranscript();
  assert.equal(context.state.fields.arbeit,'3 Stunden');
  context.state.text='Befund: Repariert. Arbeitszeit: 4 Stunden.';context.assignServiceTranscript();
  assert.equal(context.state.fields.arbeit,'4 Stunden.');
});
test('Bestehende Entwürfe und bewusst geleerte Kundenfelder bleiben erhalten',()=>{
  const context=load();context.state.text='Arbeitszeit: 2 Stunden.';context.state.fields={arbeit:'5 Stunden'};context.assignServiceTranscript();
  assert.equal(context.state.fields.arbeit,'5 Stunden');
  assert.equal(context.reportValue('kunde_name'),'Kundin GmbH');
  context.state.fields.kunde_name='';assert.equal(context.reportValue('kunde_name'),'');
});
test('Später geänderte Einsatzdaten werden übernommen, wenn nicht ausdrücklich diktiert',()=>{
  const context=load();context.state.text='Arbeiten: Pumpe gereinigt.';context.assignServiceTranscript();
  context.state.date='2026-11-02';context.state.monteur='Thomas';
  assert.equal(context.reportValue('datum'),'02.11.2026');assert.equal(context.reportValue('monteur'),'Thomas');
});
