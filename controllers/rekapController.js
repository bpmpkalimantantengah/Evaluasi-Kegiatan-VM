const axios = require('axios');
axios.defaults.headers.common['x-api-key'] = process.env.API_KEY || 'gaspol_secret_key_2026';
const VM_API_BASE = 'http://127.0.0.1:3000/api/evaluasi';

function getKategori(avg) {
  if (avg >= 4.21) return 'Sangat Baik';
  if (avg >= 3.41) return 'Baik';
  if (avg >= 2.61) return 'Cukup Baik';
  if (avg >= 1.81) return 'Kurang Baik';
  return 'Sangat Kurang Baik';
}

exports.getDetailKegiatanData = async (namaKegiatan) => {
  // 1. Ambil data mentah (rows)
  const respRekap = await axios.get(`${VM_API_BASE}/rekap/${encodeURIComponent(namaKegiatan)}`);
  const rawData = respRekap.data.data || [];
  
  // 2. Ambil instrumen untuk tahu jumlah soal & nama soal
  const respInstrumen = await axios.get(`${VM_API_BASE}/instrumen`);
  const instrumen = respInstrumen.data.data || {};
  
  // Grouping
  const grouped = { K: [], S: [], N: [] };
  rawData.forEach(row => {
    if (row.tipe_evaluasi === 'K') grouped.K.push(row);
    else if (row.tipe_evaluasi === 'S') grouped.S.push(row);
    else if (row.tipe_evaluasi === 'N') grouped.N.push(row);
  });

  const finalData = {
    K: processSeksi(grouped.K, instrumen.K || []),
    S: processSeksi(grouped.S, instrumen.S || []),
    N: processSeksiN(grouped.N, instrumen.N || [])
  };

  // Bersihkan null jika kosong
  if (!finalData.K) delete finalData.K;
  if (!finalData.S) delete finalData.S;
  if (!finalData.N) delete finalData.N;

  return finalData;
};

exports.getDetailKegiatan = async (req, res) => {
  try {
    const { namaKegiatan } = req.body;
    const finalData = await exports.getDetailKegiatanData(namaKegiatan);
    return res.json({ success: true, data: finalData });
  } catch (error) {
    console.error("Error getDetailKegiatan Controller:", error.message);
    res.json({ success: false, error: 'Gagal merangkum data rekap: ' + error.message });
  }
};

function processSeksi(rows, instrumenArr) {
  if (!rows || rows.length === 0) return null;
  
  const aspekList = [];
  let sumAvgTotal = 0;
  
  instrumenArr.forEach((pertanyaan, idx) => {
    const qKey = `a${idx + 1}`;
    let sum = 0;
    let count = 0;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    rows.forEach(row => {
      const val = parseInt(row[qKey]);
      if (!isNaN(val) && val >= 1 && val <= 5) {
        sum += val;
        count++;
        dist[val] = (dist[val] || 0) + 1;
      }
    });
    
    const avg = count > 0 ? sum / count : 0;
    sumAvgTotal += avg;
    
    aspekList.push({
      aspek: pertanyaan,
      dist,
      avg,
      kategori: getKategori(avg)
    });
  });

  const avgTotal = instrumenArr.length > 0 ? sumAvgTotal / instrumenArr.length : 0;
  
  const saranList = rows.map(r => r.saran).filter(s => s && s.trim().length > 1 && s.trim() !== '-');

  return {
    aspek: aspekList,
    saranList,
    avgTotal,
    kategori: getKategori(avgTotal)
  };
}

function processSeksiN(rows, instrumenArr) {
  if (!rows || rows.length === 0) return null;
  
  // Group by narasumber
  const byNS = {};
  rows.forEach(row => {
    const ns = row.nama_narasumber || 'Tidak Diketahui';
    if (!byNS[ns]) byNS[ns] = [];
    byNS[ns].push(row);
  });
  
  const perNS = [];
  let sumGrand = 0;
  let countNS = 0;
  
  Object.keys(byNS).forEach(nsName => {
    const nsRows = byNS[nsName];
    const seksiData = processSeksi(nsRows, instrumenArr);
    if (seksiData) {
      perNS.push({
        narasumber: nsName,
        aspek: seksiData.aspek,
        saranList: seksiData.saranList,
        avgTotal: seksiData.avgTotal,
        kategori: seksiData.kategori
      });
      sumGrand += seksiData.avgTotal;
      countNS++;
    }
  });

  const avgGrand = countNS > 0 ? sumGrand / countNS : 0;

  return {
    perNS,
    avgGrand,
    kategori: getKategori(avgGrand)
  };
}
