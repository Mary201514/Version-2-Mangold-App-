const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'style.css', 'protocols.css', 'navigation.css', 'app.js', 'protocol-catalog.js', 'protocols.js', 'navigation.js', 'features.css', 'i18n.js', 'attachments.js', 'ai.js', 'features.js', 'report-validation.js', 'business-bridge-core.js', 'business-bridge.js', 'ki-export-core.js', 'ki-export.js', 'dictation-core.js', 'dictation.js']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
for (const name of ['assets', 'vendor']) fs.cpSync(path.join(__dirname, name), path.join(output, name), { recursive: true });
console.log('Mangold App Version 2: statische Dateien in dist bereit.');
