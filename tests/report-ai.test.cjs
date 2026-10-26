const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {keys,validateProposal}=require('../lib/report-ai.cjs');
const empty=()=>({fields:Object.fromEntries(keys.map(key=>[key,{value:'',sources:[]}])),questions:[]});
const input='Pumpe 3 undicht, 2,5 bar. Dichtung D-204 ersetzt, Funktion nicht geprüft. 1,5 Stunden';
function proposal(){const result=empty();result.fields.befund={sources:['Pumpe 3 undicht, 2,5 bar.'],value:'Pumpe 3 ist bei 2,5 bar undicht.'};result.fields.arbeiten={sources:['Dichtung D-204 ersetzt, Funktion nicht geprüft.'],value:'Dichtung D-204 wurde ersetzt. Die Funktion wurde nicht geprüft.'};result.fields.arbeit={sources:['1,5 Stunden'],value:'1,5 Stunden'};return result}
test('formal prose preserves decimal values, units, article code and literal times',()=>assert.equal(validateProposal(proposal(),input).fields.arbeit.value,'1,5 Stunden'));
test('changed numbers, units and article codes are rejected',()=>{
 for(const value of ['Pumpe 3 ist bei 3,5 bar undicht.','Pumpe 3 ist bei 2,5 V undicht.','Pumpe 3 ist undicht.']){const result=proposal();result.fields.befund.value=value;assert.throws(()=>validateProposal(result,input))}
 const result=proposal();result.fields.arbeiten.value='Dichtung D-205 wurde ersetzt. Die Funktion wurde nicht geprüft.';assert.throws(()=>validateProposal(result,input));
});
test('forged source statements and calculated or converted times are rejected',()=>{
 const result=proposal();result.fields.maengel={value:'Keine Mängel',sources:['Keine Mängel']};assert.throws(()=>validateProposal(result,input));
 result.fields.maengel={value:'',sources:[]};result.fields.arbeit.value='90 Minuten';assert.throws(()=>validateProposal(result,input));
});
test('empty information stays empty and questions remain separate',()=>{
 const result=proposal();result.questions=['Wurde eine Funktionsprüfung durchgeführt?'];assert.equal(validateProposal(result,input).fields.km.value,'');
});
test('endpoint stays disabled without approval/configuration; only German reports accepted',async()=>{
 const handler=require('../api/report.js');const old={...process.env};const fetchBefore=global.fetch;
 const call=async(method,body,headers={})=>{const res={headers:{},setHeader(k,v){this.headers[k]=v},writeHead(status,h){this.status=status;Object.assign(this.headers,h)},end(data){this.data=JSON.parse(data)}};await handler({method,body,headers:{host:'localhost','content-type':'application/json',...headers}},res);return res};
 try{
  process.env.MANGOLD_AI_ENABLED='false';let fetches=0;global.fetch=async()=>{fetches++;return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal())}]}]})}};
  assert.equal((await call('GET')).data.enabled,false);assert.equal((await call('POST',{text:input})).status,503);assert.equal(fetches,0);
  Object.assign(process.env,{MANGOLD_AI_ENABLED:'true',OPENAI_API_KEY:'fake-key-for-unit-tests',OPENAI_MODEL:'fake-model',MANGOLD_AI_ACCESS_CODE:'test-code-not-for-deployment'});
  const access={'x-mangold-access':process.env.MANGOLD_AI_ACCESS_CODE};
  assert.equal((await call('POST',{text:input,language:'de',testDataConfirmed:true})).status,401);
  assert.equal((await call('POST',{text:input,language:'en',testDataConfirmed:true},access)).status,400);
  assert.equal((await call('POST',{text:input,language:'de',testDataConfirmed:true},{...access,origin:'https://other.example'})).status,403);assert.equal(fetches,0);
  assert.equal((await call('POST',{text:input,language:'de',testDataConfirmed:true},access)).status,200);assert.equal(fetches,1);
  global.fetch=async()=>{throw Error('Do not expose provider details')};const failed=await call('POST',{text:input,language:'de',testDataConfirmed:true},access);assert.equal(failed.data.error,'UNAVAILABLE');
 }finally{global.fetch=fetchBefore;for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];Object.assign(process.env,old)}
});
test('suggestions do not overwrite original or manual fields; accept/discard/restore remain explicit',async()=>{
 const context={state:{text:input,fields:{befund:'Manueller Befund'},checked:false},fields:keys.map(key=>[key,key]),structuredClone,AbortSignal,console,render(){},mark(){context.state.checked=false},toast(){},currentJobKey:()=> 'test-job',confirm:()=>true,uiText:s=>s};
 context.fetch=async(url,options)=>({ok:true,json:async()=>options?.method==='POST'?proposal():{enabled:true}});
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../ai.js'),'utf8'),context);vm.runInContext("aiAccess='test-access'",context);
 await vm.runInContext('requestAiProposal()',context);assert.equal(context.state.text,input);assert.equal(context.state.fields.befund,'Manueller Befund');assert.equal(context.state.checked,false);
 vm.runInContext('discardAiProposal()',context);assert.equal(context.state.fields.befund,'Manueller Befund');
 await vm.runInContext('requestAiProposal()',context);vm.runInContext('acceptAiProposal()',context);assert.match(context.state.fields.befund,/2,5 bar/);assert.equal(context.state.checked,false);assert.equal(context.state.aiHistory[0].fields.befund,'Manueller Befund');
 vm.runInContext('restorePreviousReport()',context);assert.equal(context.state.fields.befund,'Manueller Befund');
});
test('late result is discarded after input changes; no replacement of manual edits',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r);
 const context={state:{text:input,fields:{befund:'Original'}},fields:keys.map(key=>[key,key]),structuredClone,AbortSignal,render(){},mark(){},toast(){},currentJobKey:()=> 'test-job',fetch:async(url,options)=>({ok:true,json:async()=>options?.method==='POST'?pending:{enabled:true}})};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../ai.js'),'utf8'),context);vm.runInContext("aiAccess='test-access'",context);
 const request=vm.runInContext('requestAiProposal()',context);await new Promise(r=>setImmediate(r));context.state.text='Geänderter Originaltext';resolve(proposal());await request;assert.equal(context.state.aiProposal,undefined);assert.equal(context.state.fields.befund,'Original');
});
test('all UI translations have entries for each supported language',()=>{
 const context={localStorage:{getItem:()=>null}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../i18n.js'),'utf8'),context);
 assert.ok(vm.runInContext('uiDictionary.size>200',context));
 for(const lang of ['en','tr','ru','pl','ro']){vm.runInContext(`appLanguage='${lang}'`,context);assert.notEqual(vm.runInContext("uiText('Ausgeführte Arbeiten')",context),'Ausgeführte Arbeiten');assert.equal(vm.runInContext("uiText('D-204 / 2,5 bar')",context),'D-204 / 2,5 bar')}
});
test('connection failure preserves manual entries and reports unavailability',async()=>{
 const context={state:{text:input,fields:{befund:'Manueller Befund'}},AbortSignal,render(){},toast(){},currentJobKey:()=> 'test-job',fetch:async()=>{throw Error('offline')}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../ai.js'),'utf8'),context);await vm.runInContext('requestAiProposal()',context);
 assert.equal(context.state.fields.befund,'Manueller Befund');assert.equal(context.state.text,input);assert.match(vm.runInContext('aiMessage',context),/KI-Verbindung nicht verfügbar/);
});
