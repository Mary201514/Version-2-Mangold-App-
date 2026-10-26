(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldReportValidation=factory()})(this,function(){
 const keys=['befund','arbeiten','material','arbeit','ruest','warte','hin','rueck','km','maengel'];
 function numbers(text){return (text.match(/\d+(?:[.,:/-]\d+)*/g)||[]).sort()}
 function technicalTokens(text){return (text.match(/\b[\p{L}]+[-/]\d[\p{L}\p{N}./-]*\b|\b\d+(?:[.,]\d+)?\s*(?:mA|kW|kWh|mm|cm|m³|m3|km|Hz|V|A|bar|Nm|°C|Ω|Stunden?|Minuten?|Sekunden?|Std\.?|Min\.?|h|min|s|Stück|Liter|l|kg|g)\b/gu)||[]).sort()}
 function sameValues(source,value){return JSON.stringify(numbers(source))===JSON.stringify(numbers(value))&&JSON.stringify(technicalTokens(source))===JSON.stringify(technicalTokens(value))}
 function validateProposal(result,text){
  if(!result||!Array.isArray(result.questions)||result.questions.length>8||result.questions.some(q=>typeof q!=='string'||q.length>1000))throw Error('INVALID_RESULT');
  const fields={};
  for(const key of keys){
   const field=result.fields?.[key];
   if(!field||typeof field.value!=='string'||!Array.isArray(field.sources)||field.sources.some(s=>typeof s!=='string'||!s.trim()||!text.includes(s)))throw Error('INVALID_SOURCE');
   const source=field.sources.join('\n');
   if(!source&&field.value)throw Error('MISSING_SOURCE');
   if(field.value.length>12000||!sameValues(source,field.value))throw Error('CHANGED_VALUES');
   if(!['befund','arbeiten'].includes(key)&&field.value!==source)throw Error('CHANGED_LITERAL');
   fields[key]={value:field.value,sources:field.sources};
  }
  return {fields,questions:result.questions};
 }
 return {keys,validateProposal,sameValues};
});
