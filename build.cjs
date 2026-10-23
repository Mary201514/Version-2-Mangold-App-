const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'style.css', 'protocols.css', 'navigation.css', 'app.js', 'protocol-catalog.js', 'protocols.js', 'navigation.js']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
for (const name of ['assets', 'vendor']) fs.cpSync(path.join(__dirname, name), path.join(output, name), { recursive: true });
console.log('Mangold App Version 2: statische Dateien in dist bereit.');
