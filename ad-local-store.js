(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldAdStore=factory()})(this,function(){
 let database;
 function open(){if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('mangold-ad-reports-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('reports',{keyPath:'id'}).createIndex('job','job');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=null;reject(Error('LOCAL_STORE_UNAVAILABLE'))}});return database}
 async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('reports',mode),store=tx.objectStore('reports');let result;try{const request=action(store);request.onsuccess=()=>{result=request.result};request.onerror=()=>tx.abort()}catch{tx.abort()}tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('LOCAL_STORE_FAILED'))})}
 async function save(record){const existing=await transaction('readonly',store=>store.get(record.id));if(existing)return existing;await transaction('readwrite',store=>store.put(record));return record}
 async function list(job){const rows=await transaction('readonly',store=>store.index('job').getAll(job));return rows.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).map(({id,job,name,savedAt,signedRoles})=>({id,job,name,savedAt,signedRoles}))}
 async function get(id,job){const row=await transaction('readonly',store=>store.get(id));if(!row||row.job!==job)throw Error('OTHER_JOB');return row}
 return {save,list,get};
});
