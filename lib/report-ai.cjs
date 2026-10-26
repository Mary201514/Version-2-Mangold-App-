const crypto=require('node:crypto');
const {keys,validateProposal}=require('../report-validation.js');
const languages={de:'German',en:'English',tr:'Turkish',ru:'Russian',pl:'Polish',ro:'Romanian'};
function configured(){return process.env.MANGOLD_AI_ENABLED==='true'&&!!process.env.OPENAI_API_KEY&&!!process.env.OPENAI_MODEL&&(process.env.MANGOLD_AI_ACCESS_CODE||'').length>=16}
const schema={type:'object',additionalProperties:false,required:['fields','questions'],properties:{fields:{type:'object',additionalProperties:false,required:keys,properties:Object.fromEntries(keys.map(key=>[key,{type:'object',additionalProperties:false,required:['value','sources'],properties:{value:{type:'string'},sources:{type:'array',items:{type:'string'}}}}]))},questions:{type:'array',items:{type:'string'}}}};
function authorized(value){const a=crypto.createHash('sha256').update(String(value||'')).digest(),b=crypto.createHash('sha256').update(process.env.MANGOLD_AI_ACCESS_CODE||'').digest();return crypto.timingSafeEqual(a,b)}
module.exports={keys,configured,validateProposal,schema,languages,authorized};
