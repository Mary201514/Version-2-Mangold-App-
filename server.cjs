const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
http.createServer((req,res)=>{
 const routes={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'};
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=routes[pathname];
 if(!file){res.writeHead(404);return res.end('Nicht gefunden');}
 fs.readFile(path.join(root,file),(err,data)=>{if(err){res.writeHead(500);return res.end('Datei nicht lesbar');}res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
