const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'style.css', 'protocols.css', 'navigation.css', 'app.js', 'protocol-catalog.js', 'protocols.js', 'navigation.js', 'features.css', 'i18n.js', 'attachments.js', 'ai.js', 'features.js', 'report-validation.js', 'business-bridge-core.js', 'business-bridge.js', 'ki-export-core.js', 'ki-export.js', 'dictation-core.js', 'dictation.js', 'service-history-core.js', 'service-history.js', 'service-history.css','ad-template.js','ad-proof-core.js','ad-proof-pdf.js','ad-proof.js','ad-proof.css','offline.js','ad-signature-core.js','ad-signatures.js','ad-local-store.js']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
for (const name of ['assets', 'vendor']) fs.cpSync(path.join(__dirname, name), path.join(output, name), { recursive: true });
console.log('Mangold App Version 2: statische Dateien in dist bereit.');

const crypto=require('node:crypto');
function filesIn(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?filesIn(path.join(dir,entry.name)):[path.join(dir,entry.name)])}
const assets=filesIn(output).filter(file=>!['sw.js','offline-assets.json'].includes(path.basename(file))).sort();
const hash=crypto.createHash('sha256');for(const file of assets){hash.update(path.relative(output,file));hash.update(fs.readFileSync(file))}const release=hash.digest('hex').slice(0,16);
const urls=assets.map(file=>'/'+path.relative(output,file).split(path.sep).join('/'));
fs.writeFileSync(path.join(output,'sw.js'),fs.readFileSync(path.join(__dirname,'sw-template.js'),'utf8').replace('__RELEASE__',JSON.stringify(release)).replace('__FILES__',JSON.stringify(urls)));
fs.writeFileSync(path.join(output,'offline-assets.json'),JSON.stringify({release,files:urls}));
console.log('Offline release '+release+': '+urls.length+' Dateien.');
