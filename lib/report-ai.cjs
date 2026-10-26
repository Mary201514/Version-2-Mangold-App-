const crypto=require('node:crypto');
const keys=['befund','arbeiten','material','arbeit','ruest','warte','hin','rueck','km','maengel'];
const languages={de:'German',en:'English',tr:'Turkish',ru:'Russian',pl:'Polish',ro:'Romanian'};
function configured(){return process.env.MANGOLD_AI_ENABLED==='true'&&!!process.env.OPENAI_API_KEY&&!!process.env.OPENAI_MODEL&&(process.env.MANGOLD_AI_ACCESS_CODE||'').length>=16}
function numbers(text){return (text.match(/\d+(?:[.,:/-]\d+)*/g)||[]).sort()}
function technicalTokens(text){return (text.match(/\b[\p{L}]+[-/]\d[\p{L}\p{N}./-]*\b|\b\d+(?:[.,]\d+)?\s*(?:mA|kW|kWh|mm|cm|m³|m3|km|Hz|V|A|bar|Nm|°C|Ω|Stunden?|Minuten?|Sekunden?|Std\.?|Min\.?|h|min|s|Stück|Liter|l|kg|g)\b/gu)||[]).sort()}
function validateProposal(result,text){
 if(!result||!Array.isArray(result.questions)||result.questions.length>8||result.questions.some(q=>typeof q!=='string'||q.length>1000))throw Error('INVALID_RESULT');
 const fields={};
 for(const key of keys){
  const field=result.fields?.[key];
  if(!field||typeof field.value!=='string'||!Array.isArray(field.sources)||field.sources.some(s=>typeof s!=='string'||!s.trim()||!text.includes(s)))throw Error('INVALID_SOURCE');
  const source=field.sources.join('\n');
  if(!source&&field.value)throw Error('MISSING_SOURCE');
  if(field.value.length>12000||JSON.stringify(numbers(source))!==JSON.stringify(numbers(field.value))||JSON.stringify(technicalTokens(source))!==JSON.stringify(technicalTokens(field.value)))throw Error('CHANGED_VALUES');
  // Only findings and work descriptions may be rephrased; quantities/times remain literal.
  if(!['befund','arbeiten'].includes(key)&&field.value!==source)throw Error('CHANGED_LITERAL');
  fields[key]={value:field.value,sources:field.sources};
 }
 return {fields,questions:result.questions};
}
const schema={type:'object',additionalProperties:false,required:['fields','questions'],properties:{fields:{type:'object',additionalProperties:false,required:keys,properties:Object.fromEntries(keys.map(key=>[key,{type:'object',additionalProperties:false,required:['value','sources'],properties:{value:{type:'string'},sources:{type:'array',items:{type:'string'}}}}]))},questions:{type:'array',items:{type:'string'}}}};
function authorized(value){const a=crypto.createHash('sha256').update(String(value||'')).digest(),b=crypto.createHash('sha256').update(process.env.MANGOLD_AI_ACCESS_CODE||'').digest();return crypto.timingSafeEqual(a,b)}
module.exports={keys,configured,validateProposal,schema,languages,authorized};
