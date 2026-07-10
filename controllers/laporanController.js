const fs = require('fs');
const axios = require('axios');
axios.defaults.headers.common['x-api-key'] = process.env.API_KEY || 'gaspol_secret_key_2026';
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const rekapController = require('./rekapController');

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
    // Add hanging indent with tabs
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

function formatTanggalIndo(tglMulai, tglAkhir) {
  const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const d1 = new Date(tglMulai);
  const d2 = new Date(tglAkhir);
  
  if (isNaN(d1) || isNaN(d2)) return `${tglMulai} s.d. ${tglAkhir}`;
  
  const day1 = d1.getDate();
  const month1 = d1.getMonth();
  const year1 = d1.getFullYear();
  
  const day2 = d2.getDate();
  const month2 = d2.getMonth();
  const year2 = d2.getFullYear();
  
  if (year1 !== year2) {
    return `${day1} ${bulanIndo[month1]} ${year1} s.d. ${day2} ${bulanIndo[month2]} ${year2}`;
  } else if (month1 !== month2) {
    return `${day1} ${bulanIndo[month1]} s.d. ${day2} ${bulanIndo[month2]} ${year1}`;
  } else if (day1 !== day2) {
    return `${day1} s.d. ${day2} ${bulanIndo[month1]} ${year1}`;
  } else {
    return `${day1} ${bulanIndo[month1]} ${year1}`;
  }
}

exports.generateLaporan = async (req, res) => {
  const { namaKegiatan, ringkasanAI } = req.body;
  if (!namaKegiatan) return res.status(400).json({ success: false, error: 'Nama kegiatan tidak diberikan.' });

  try {
    // 1. Baca template dari folder templates/
    const templatePath = path.resolve(__dirname, '../templates/template_laporan.docx');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template DOCX tidak ditemukan di: ${templatePath}`);
    }
    
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

    // 2. Di sini kita akan memasukkan data detail evaluasi dan ringkasan AI
    const finalData = await rekapController.getDetailKegiatanData(namaKegiatan);

    let waktuPelaksanaan = 'Sesuai jadwal kegiatan';
    let tempatPelaksanaan = '-';
    let penanggungJawab = '-';

    try {
        const respKegiatan = await axios.get(`http://127.0.0.1:3000/api/evaluasi/kegiatan/semua`);
        const allKeg = respKegiatan.data?.data || [];
        const keg = allKeg.find(k => k.nama_kegiatan === namaKegiatan);
        if (keg) {
           if (keg.tgl_mulai && keg.tgl_akhir) {
             waktuPelaksanaan = formatTanggalIndo(keg.tgl_mulai, keg.tgl_akhir);
           } else {
             waktuPelaksanaan = 'Sesuai jadwal kegiatan';
           }
           tempatPelaksanaan = keg.tempat || '-';
           penanggungJawab = keg.penanggungjawab || '-';
        }
    } catch (err) {
        console.error('Error get detail kegiatan for laporan:', err.message);
    }

    const templateVars = {
      NAMA_KEGIATAN: namaKegiatan,
      WAKTU_PELAKSANAAN: waktuPelaksanaan,
      TEMPAT_PELAKSANAAN: tempatPelaksanaan,
      PENANGGUNGJAWAB: penanggungJawab,
      RINGKASAN_AI: markdownToDocxXml(ringkasanAI || 'Ringkasan belum tersedia.'),
    };

    let avgK = 0, avgS = 0, avgN = 0;

    if (finalData.K) {
       avgK = finalData.K.avgTotal || 0;
       templateVars.SKOR_K = avgK.toFixed(2);
       templateVars.PERSEN_K = ((avgK / 5) * 100).toFixed(2) + '%';
       templateVars.KATEGORI_K = finalData.K.kategori;
       
       if (finalData.K.aspek) {
         finalData.K.aspek.forEach((aspek, aIdx) => {
            templateVars[`TOTAL_K${aIdx + 1}`] = (aspek.avg || 0).toFixed(2);
            templateVars[`RERATA_K${aIdx + 1}`] = (aspek.avg || 0).toFixed(2);
         });
       }
       templateVars.TOTAL_SKOR_K = templateVars.SKOR_K;
       templateVars.TOTAL_RERATA_K = templateVars.SKOR_K;
       templateVars.RERATA_TOTAL_K = templateVars.SKOR_K;
       templateVars.RERATA_K = templateVars.SKOR_K;
    } else {
       templateVars.SKOR_K = '-';
       templateVars.PERSEN_K = '-';
       templateVars.KATEGORI_K = '-';
    }

    if (finalData.S) {
       avgS = finalData.S.avgTotal || 0;
       templateVars.SKOR_S = avgS.toFixed(2);
       templateVars.PERSEN_S = ((avgS / 5) * 100).toFixed(2) + '%';
       templateVars.KATEGORI_S = finalData.S.kategori;
       
       if (finalData.S.aspek) {
         finalData.S.aspek.forEach((aspek, aIdx) => {
            templateVars[`TOTAL_S${aIdx + 1}`] = (aspek.avg || 0).toFixed(2);
            templateVars[`RERATA_S${aIdx + 1}`] = (aspek.avg || 0).toFixed(2);
         });
       }
       templateVars.TOTAL_SKOR_S = templateVars.SKOR_S;
       templateVars.TOTAL_RERATA_S = templateVars.SKOR_S;
       templateVars.RERATA_TOTAL_S = templateVars.SKOR_S;
       templateVars.RERATA_S = templateVars.SKOR_S;
    } else {
       templateVars.SKOR_S = '-';
       templateVars.PERSEN_S = '-';
       templateVars.KATEGORI_S = '-';
    }

    if (finalData.N) {
       avgN = finalData.N.avgGrand || 0;
       templateVars.SKOR_N = avgN.toFixed(2);
       templateVars.PERSEN_N = ((avgN / 5) * 100).toFixed(2) + '%';
       templateVars.KATEGORI_N = finalData.N.kategori;
       templateVars.RERATA_NARSUM = templateVars.SKOR_N;
       
       if (finalData.N.perNS) {
         finalData.N.perNS.forEach((ns, index) => {
            const idx = index + 1;
            templateVars[`NARSUM${idx}`] = ns.narasumber;
            templateVars[`TOTAL_NARSUM${idx}`] = (ns.avgTotal || 0).toFixed(2);
            templateVars[`RERATA_NARSUM${idx}`] = (ns.avgTotal || 0).toFixed(2);
            if (ns.aspek) {
                ns.aspek.forEach((aspek, aIdx) => {
                     templateVars[`NARSUM${idx}_N${aIdx + 1}`] = (aspek.avg || 0).toFixed(2);
                });
            }
         });
       }
    } else {
       templateVars.SKOR_N = '-';
       templateVars.PERSEN_N = '-';
       templateVars.KATEGORI_N = '-';
    }

    // fallback empty graphics initially
    templateVars.GRAFIK_EVALUASI = '';

    // Generate chart via QuickChart
    const chartConfig = {
      type: 'bar',
      data: {
        labels: ['Keterlaksanaan', 'Sarana Prasarana', 'Narasumber'],
        datasets: [{
          label: 'Rata-rata Skor',
          data: [Number(avgK.toFixed(2)), Number(avgS.toFixed(2)), Number(avgN.toFixed(2))],
          backgroundColor: ['#00BFFF', '#FFD700', '#32CD32']
        }]
      },
      options: {
        legend: {
          display: false
        },
        plugins: {
          datalabels: { display: true, align: 'end', anchor: 'end' }
        },
        scales: {
          yAxes: [{ ticks: { min: 0, max: 5 } }]
        }
      }
    };
    
    try {
      const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=250`;
      const respChart = await axios.get(chartUrl, { responseType: 'arraybuffer' });
      templateVars.GRAFIK_EVALUASI = Buffer.from(respChart.data, 'binary').toString('base64');
    } catch (e) {
      console.error('Failed to generate chart via QuickChart:', e.message);
    }

    doc.render(templateVars);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 3. Kembalikan buffer sebagai file Base64 (atau unduhan langsung)
    const base64Data = buf.toString('base64');
    
    res.json({
      success: true,
      base64: base64Data,
      filename: `Laporan_Evaluasi_${namaKegiatan.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
    });

  } catch (error) {
    console.error('Error generating laporan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
