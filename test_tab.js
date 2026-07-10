function markdownToDocxXml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let xml = '';
  lines.forEach(line => {
    let lineXml = '<w:p>';
    lineXml += '<w:pPr><w:ind w:left="480" w:hanging="480"/><w:tabs><w:tab w:val="left" w:pos="480"/></w:tabs><w:spacing w:after="120"/></w:pPr>';
    
    line = line.trim();
    if (!line) return;

    let prefix = '';
    let textPart = line;
    const match = line.match(/^(\d+[\.\)]|[-*])\s+/);
    if (match) {
      prefix = match[1];
      textPart = line.substring(match[0].length);
      lineXml += `<w:r><w:t xml:space="preserve">${prefix}</w:t></w:r><w:r><w:tab/></w:r>`;
    }

    const parts = textPart.split('**');
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        lineXml += `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(parts[i])}</w:t></w:r>`;
      } else {
        if (parts[i]) {
          lineXml += `<w:r><w:t xml:space="preserve">${escapeXml(parts[i])}</w:t></w:r>`;
        }
      }
    }
    lineXml += '</w:p>';
    xml += lineXml;
  });
  return xml;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

console.log(markdownToDocxXml("1. Pelayanan yang diberikan **sangat baik** dan perlu dipertahankan."));
