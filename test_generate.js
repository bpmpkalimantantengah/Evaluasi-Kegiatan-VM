const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const axios = require('axios');

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

function markdownToDocxXml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let xml = '';
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    let lineXml = '<w:p>';
    // Add hanging indent: text starts at 480 twips (0.33"), first line at 0
    lineXml += '<w:pPr><w:ind w:left="480" w:hanging="480"/><w:tabs><w:tab w:val="left" w:pos="480"/></w:tabs><w:spacing w:after="120"/></w:pPr>';
    
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

async function run() {
  const templatePath = path.resolve(__dirname, 'templates/template_laporan.docx');
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  
  const imageOptions = {
      centered: true,
      getImage: function(tagValue) {
          if (!tagValue) return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
          return Buffer.from(tagValue, 'base64');
      },
      getSize: function() {
          return [500, 250];
      }
  };
  const imageModule = new ImageModule(imageOptions);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: function() { return "-"; },
    modules: [imageModule]
  });

  const chartConfig = {
    type: 'bar',
    data: {
      labels: ['Keterlaksanaan', 'Sarana Prasarana', 'Narasumber'],
      datasets: [{
        label: 'Rata-rata Skor',
        data: [4.5, 3.8, 4.2],
        backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)']
      }]
    },
    options: {
      scales: {
        yAxes: [{ ticks: { min: 0, max: 5 } }]
      }
    }
  };
  
  let imageBase64 = '';
  try {
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=250`;
    const resp = await axios.get(chartUrl, { responseType: 'arraybuffer' });
    imageBase64 = Buffer.from(resp.data, 'binary').toString('base64');
  } catch (e) {
    console.error('Error fetching chart:', e);
  }

  const ringkasanAI = "1. Kualitas layanan perlu ditingkatkan.\n2. Kegiatan ini **sangat penting** dan perlu dilanjutkan secara **berkelanjutan**.";

  doc.render({
    NAMA_KEGIATAN: "Test Kegiatan",
    RINGKASAN_AI: markdownToDocxXml(ringkasanAI),
    GRAFIK_EVALUASI: imageBase64,
    SKOR_K: '4.5',
    PERSEN_K: '90%',
    KATEGORI_K: 'Amat Baik',
    SKOR_S: '3.8',
    PERSEN_S: '76%',
    KATEGORI_S: 'Baik',
    SKOR_N: '4.2',
    PERSEN_N: '84%',
    KATEGORI_N: 'Sangat Baik'
  });

  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  fs.writeFileSync('test_output.docx', buf);
  console.log('Generated test_output.docx');
}

run();
