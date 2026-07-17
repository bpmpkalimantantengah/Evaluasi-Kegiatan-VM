const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
axios.defaults.headers.common['x-api-key'] = process.env.API_KEY || 'gaspol_secret_key_2026';

const fs = require('fs');
const path = require('path');

function getGenerativeModel() {
  let apiKey = process.env.GEMINI_API_KEY;
  try {
    const configPath = path.join(__dirname, '../../GASPOL-V2/config/aiConfig.json');
    if (fs.existsSync(configPath)) {
      const list = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (list && list.length > 0 && list[0].apiKey) {
        apiKey = list[0].apiKey;
      }
    }
  } catch (err) {
    console.error('Error reading aiConfig.json:', err.message);
  }
  
  if (!apiKey) apiKey = 'dummy_key';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// Helper: Fetch saran list from the DB or existing API
async function _getSaranList(namaKegiatan, tipe, namaNarasumber) {
  try {
    const url = "http://127.0.0.1:4001/evaluasi/api/rekap/" + encodeURIComponent(namaKegiatan);
    const res = await axios.get(url);
    const json = res.data;
    if (!json.success || !json.data) return [];
    
    return json.data
      .filter(r => {
        if (tipe && r.tipe_evaluasi !== tipe) return false;
        if (tipe === 'N' && namaNarasumber) {
          return String(r.nama_narasumber || '').trim() === namaNarasumber.trim();
        }
        return true;
      })
      .map(r => String(r.saran || '').trim())
      .filter(s => s && s !== '-' && s.length > 2);
  } catch (err) {
    console.error('Error fetching saran list:', err);
    return [];
  }
}

function _buildPrompt(saranList) {
  const saranFormatted = saranList
    .map((s, i) => (i + 1) + '. ' + s)
    .join('\n');

  return `Tugas Anda adalah merangkum semua saran/masukan berikut.
Ketentuan MUTLAK:
1. GABUNGKAN saran yang sama, mirip, atau berkaitan.
2. Output HARUS LANGSUNG poin angka (1., 2., 3., dst).
3. DILARANG KERAS memberikan kalimat pengantar atau pembuka.
4. DILARANG KERAS memberikan kalimat penutup atau kesimpulan.
5. DILARANG KERAS menggunakan sub-judul atau kategori. Semua melebur menjadi satu list.
6. DILARANG KERAS memulai poin dengan kata kerja aktif.
7. PASTIKAN SEMUA saran terangkum tanpa terkecuali. JANGAN ADA YANG TERLEWATKAN.
8. Selesaikan semua kalimat hingga tuntas (berakhir dengan titik).
9. PENTING: Beri cetak tebal (bold) menggunakan format markdown (contoh: **kurang memadai**) HANYA pada kata atau kalimat yang menyatakan hal yang perlu ditingkatkan, hal yang masih kurang, atau kendala.

Data Saran Keseluruhan:
${saranFormatted}`;
}

exports.rangkumSaran = async (req, res) => {
  const { namaKegiatan, tipe, namaNarasumber } = req.body;
  if (!namaKegiatan || !tipe) return res.status(400).json({ success: false, error: 'Parameter tidak lengkap.' });

  const saranList = await _getSaranList(namaKegiatan, tipe, namaNarasumber);
  if (!saranList || saranList.length === 0) {
    return res.json({ success: false, error: 'Tidak ada saran yang tersedia untuk dirangkum.', code: 'NO_DATA' });
  }

  try {
    const prompt = _buildPrompt(saranList);
    const model = getGenerativeModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      ringkasan: text,
      model: 'gemini-1.5-flash',
      jumlahSaran: saranList.length,
      tipe: tipe,
      namaNarasumber: namaNarasumber || null,
    });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.rangkumSemua = async (req, res) => {
  const { namaKegiatan } = req.body;
  if (!namaKegiatan) return res.status(400).json({ success: false, error: 'Nama kegiatan tidak diberikan.' });

  const saranList = await _getSaranList(namaKegiatan, null, null);
  if (!saranList || saranList.length === 0) {
    return res.json({ success: false, error: 'Tidak ada saran yang tersedia.', code: 'NO_DATA' });
  }

  const maxSaranForAI = 300;
  const saranForAI = saranList.length > maxSaranForAI ? saranList.slice(0, maxSaranForAI) : saranList;

  try {
    const prompt = _buildPrompt(saranForAI);
    const model = getGenerativeModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      ringkasan: text,
      model: 'gemini-1.5-flash',
      jumlahSaran: saranList.length
    });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSemuaSaranMentah = async (req, res) => {
  const { namaKegiatan } = req.query;
  if (!namaKegiatan) return res.status(400).json({ success: false, error: 'Nama kegiatan tidak diberikan.' });
  
  const saranList = await _getSaranList(namaKegiatan, null, null);
  if (!saranList || saranList.length === 0) {
    return res.json({ success: false, error: 'Tidak ada saran yang tersedia.', code: 'NO_DATA' });
  }
  const rawList = saranList.map((s, i) => (i + 1) + '. ' + s).join('\n');
  res.json({ success: true, text: rawList, jumlahSaran: saranList.length });
};
