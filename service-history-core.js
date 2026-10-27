(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldServiceHistory=factory()})(this,function(){
 // Synthetic identities only. An ERP adapter must supply its own verified IDs.
 const identities=[
  {customerId:'DEMO-K001',plantId:'DEMO-A001',customer:'Musterfirma GmbH',plant:'Schmutzwasserpumpe 2',serial:'SWP-2024-001'},
  {customerId:'DEMO-K002',plantId:'DEMO-A002',customer:'Beispieltechnik AG',plant:'Hebeanlage 1',serial:'HA-DEMO-002'},
  {customerId:'DEMO-K003',plantId:'DEMO-A003',customer:'Demobetrieb KG',plant:'Pumpensteuerung 3',serial:'PS-DEMO-003'}
 ];
 const picture=(file,label)=>({src:'assets/history-demo/'+file+'.svg',label});
 const rows=[
  {id:'DEMO-0918',customerId:'DEMO-K001',plantId:'DEMO-A001',date:'2026-10-09',kind:'Wartung',summary:'Pumpe gereinigt und Dichtung erneuert. Probelauf dokumentiert.',images:[picture('pump','Pumpe – Demo-Abbildung'),picture('plate','Typenschild – Demo-Abbildung')]},
  {id:'DEMO-0742',customerId:'DEMO-K001',plantId:'DEMO-A001',date:'2026-07-16',kind:'Reparatur',summary:'Undichte Dichtung ersetzt. Anlage wieder montiert.',images:[picture('pump','Pumpe – Demo-Abbildung')]},
  {id:'DEMO-0421',customerId:'DEMO-K001',plantId:'DEMO-A001',date:'2026-03-05',kind:'Inspektion',summary:'Anlagenzustand aufgenommen und im Prüfprotokoll festgehalten.',images:[]},
  {id:'DEMO-0111',customerId:'DEMO-K001',plantId:'DEMO-A001',date:'2025-11-12',kind:'Wartung',summary:'Älterer künstlicher Testeinsatz.',images:[]},
  {id:'DEMO-0922',customerId:'DEMO-K002',plantId:'DEMO-A002',date:'2026-10-08',kind:'Inspektion',summary:'Hebeanlage besichtigt und Zustand dokumentiert.',images:[picture('pump','Hebeanlage – Demo-Abbildung')]},
  {id:'DEMO-0681',customerId:'DEMO-K002',plantId:'DEMO-A002',date:'2026-06-11',kind:'Wartung',summary:'Behälter und Pumpenbereich gereinigt.',images:[picture('plate','Typenschild – Demo-Abbildung')]},
  {id:'DEMO-0302',customerId:'DEMO-K002',plantId:'DEMO-A002',date:'2026-02-12',kind:'Reparatur',summary:'Dichtung ersetzt und Arbeit dokumentiert.',images:[]},
  {id:'DEMO-0931',customerId:'DEMO-K003',plantId:'DEMO-A003',date:'2026-10-07',kind:'Service',summary:'Steuerung besichtigt und Anschlussbelegung dokumentiert.',images:[picture('control','Steuerung – Demo-Abbildung')]},
  {id:'DEMO-0701',customerId:'DEMO-K003',plantId:'DEMO-A003',date:'2026-07-02',kind:'Wartung',summary:'Schaltschrank gereinigt und Sichtkontrolle dokumentiert.',images:[picture('control','Schaltschrank – Demo-Abbildung')]},
  {id:'DEMO-0351',customerId:'DEMO-K003',plantId:'DEMO-A003',date:'2026-02-26',kind:'Inspektion',summary:'Zustand und Typenschild aufgenommen.',images:[picture('plate','Typenschild – Demo-Abbildung')]}
 ].map(row=>({...row,status:'completed',source:'demo'}));
 function demoIdentity(order){return identities.find(item=>item.customer===order?.customer&&item.plant===order?.plant&&item.serial===order?.serial)||null}
 function latest(records,identity,currentId){
  if(!identity?.customerId||!identity?.plantId)return [];
  return records.filter(row=>row.customerId===identity.customerId&&row.plantId===identity.plantId&&row.status==='completed'&&row.id!==currentId&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&!Number.isNaN(Date.parse(row.date)))
   .slice().sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,3);
 }
 function forDemoOrder(order){return latest(rows,demoIdentity(order),order?.id).map(row=>structuredClone(row))}
 function safeDemoImage(src){return /^assets\/history-demo\/(pump|control|plate)\.svg$/.test(src||'')}
 return {demoIdentity,latest,forDemoOrder,safeDemoImage};
});
