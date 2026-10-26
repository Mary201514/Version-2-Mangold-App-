const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
http.createServer((req,res)=>{
 const routes={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/protocols.js':'protocols.js','/protocol-catalog.js':'protocol-catalog.js'};
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/report')return require('./api/report.js')(req,res);
 const asset=/^\/(assets|vendor)\/[a-zA-Z0-9_./-]+$/.test(pathname) && !pathname.split('/').includes('..') ? pathname.slice(1) : null;
 const file=routes[pathname] || (['/protocols.css','/navigation.css','/navigation.js','/features.css','/i18n.js','/attachments.js','/ai.js','/features.js'].includes(pathname)?pathname.slice(1):null) || asset;
 if(!file){res.writeHead(404);return res.end('Nicht gefunden');}
 const ext=path.extname(file);const types={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.pdf':'application/pdf','.jpg':'image/jpeg','.png':'image/png','.html':'text/html; charset=utf-8'};
 fs.readFile(path.join(root,file),(err,data)=>{if(err){res.writeHead(404);return res.end('Datei nicht lesbar');}res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
