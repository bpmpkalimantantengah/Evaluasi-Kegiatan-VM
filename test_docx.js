const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const zip = new PizZip();
zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{SKOR_K}}</w:t></w:r></w:p></w:body></w:document>');
const doc = new Docxtemplater(zip, {
  delimiters: { start: '{{', end: '}}' },
  nullGetter: function() { return '-'; }
});
doc.render({ SKOR_K: 'undefined' });
console.log('Value: ', doc.getZip().file('word/document.xml').asText());
