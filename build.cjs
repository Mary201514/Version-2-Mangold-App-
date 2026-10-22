const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'style.css', 'app.js']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
console.log('Mangold App Version 2: statische Dateien in dist bereit.');
