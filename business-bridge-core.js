(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./report-validation.js'));else root.MangoldBusinessBridge=factory(root.MangoldReportValidation)})(this,function(validation){
 const format='mangold-ad-v1';
 function parse(raw,original,job){
  if(typeof raw!=='string'||!raw.trim()||raw.length>80000)throw Error('EMPTY_IMPORT');
  const clean=raw.trim().replace(/^```(?:json)?\s*\n/i,'').replace(/\n```$/,'');let result;
  try{result=JSON.parse(clean)}catch{throw Error('FORMAT')}
  if(!result||result.format!==format||typeof result.originaltext!=='string'||!result.originaltext.trim()||result.originaltext.length>12000||typeof result.report!=='string'||result.report.length>20000)throw Error('FORMAT');
  if(job&&result.job!==job)throw Error('OTHER_JOB');
  if(original?.trim()&&original.trim()!==result.originaltext.trim())throw Error('OTHER_ORIGINAL');
  const source=original?.trim()?original:result.originaltext;
  const proposal=validation.validateProposal(result,source);
  if(result.report.trim()&&!validation.sameValues(source,result.report))throw Error('REPORT_VALUES');
  return {mode:'fields',sourceText:source,report:result.report,fields:proposal.fields,questions:proposal.questions};
 }
 function plain(raw,original,job){
  if(typeof raw!=='string'||!raw.trim()||raw.length>20000)throw Error('EMPTY_IMPORT');
  if(/^\s*(?:\{|```)/.test(raw)){const result=parse(raw,original,job);return {...result,mode:'report'}}
  if(original?.trim()&&!validation.sameValues(original,raw))throw Error('REPORT_VALUES');
  return {mode:'report',sourceText:original||'',report:raw,questions:[],fields:{}};
 }
 return {format,parse,plain};
});
