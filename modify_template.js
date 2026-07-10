const fs = require('fs');
const PizZip = require('pizzip');

const templatePath = 'templates/template_laporan.docx';
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

let xml = zip.file('word/document.xml').asText();
xml = xml.replace(/\{RINGKASAN_AI\}/g, '{@RINGKASAN_AI}');
xml = xml.replace(/\{GRAFIK_EVALUASI\}/g, '{%GRAFIK_EVALUASI}');

zip.file('word/document.xml', xml);
const buf = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync(templatePath, buf);
console.log('Template modified successfully.');
