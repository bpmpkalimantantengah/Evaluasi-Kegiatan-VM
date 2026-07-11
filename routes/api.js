const express = require('express');
const router = express.Router();
const axios = require('axios');
const aiController = require('../controllers/aiController');
const laporanController = require('../controllers/laporanController');
const rekapController = require('../controllers/rekapController');
const dbSSO = require('../config/db_sso');

const ssoCache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

const VM_API_BASE = 'http://127.0.0.1:3000/api/evaluasi';
axios.defaults.headers.common['x-api-key'] = process.env.API_KEY || 'gaspol_secret_key_2026';

// Action Dispatcher to emulate GAS Code.js processAction
router.post('/action', async (req, res) => {
  const { action, ...data } = req.body;
  
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // -- Auth Middleware --
  if (!token) {
    return res.status(401).json({ success: false, error: 'Autentikasi diperlukan. Token tidak ditemukan.' });
  }
  
  const now = Date.now();
  if (ssoCache.has(token) && now - ssoCache.get(token).ts < CACHE_TTL) {
    data.user = ssoCache.get(token).user;
  } else {
    try {
      const [sessions] = await dbSSO.query('SELECT userId FROM Sessions WHERE token = ? AND isValid = 1 AND expiresAt > NOW() LIMIT 1', [token]);
      if (sessions.length === 0) {
        return res.status(401).json({ success: false, error: 'Sesi telah berakhir. Silakan login kembali.' });
      }
      
      const [users] = await dbSSO.query('SELECT userId, username, fullName, role, status FROM Users WHERE userId = ? LIMIT 1', [sessions[0].userId]);
      if (users.length === 0 || users[0].status !== 'ACTIVE') {
        return res.status(401).json({ success: false, error: 'Akun Anda tidak aktif atau tidak valid.' });
      }
      
      data.user = users[0];
      ssoCache.set(token, { user: users[0], ts: now });
      if (ssoCache.size > 1000) ssoCache.delete(ssoCache.keys().next().value);
    } catch (err) {
      console.error('SSO DB Error:', err);
      return res.status(500).json({ success: false, error: 'Gagal memverifikasi token sesi.' });
    }
  }
  // ---------------------
  
  try {
    let response;
    switch(action) {
      // -- Kegiatan --
      case 'getSemuaKegiatan':
        const { user, ...queryParams } = data;
        response = await axios.get(`${VM_API_BASE}/kegiatan/semua`, { params: queryParams });
        if (response.data && Array.isArray(response.data.data)) {
          response.data.data = response.data.data.map(item => ({
            ...item,
            namaKegiatan: item.nama_kegiatan || '',
            kodeUnik: item.kode_unik || '',
            narasumberList: item.narasumber_list || '',
            tglMulai: item.tgl_mulai || '',
            tglAkhir: item.tgl_akhir || '',
            timKerja: item.tim_kerja || '',
            createdBy: item.created_by || '',
            tglImport: item.tgl_import || ''
          }));
        }
        return res.json(response.data);
        
      case 'getDetailKegiatan':
        return rekapController.getDetailKegiatan(req, res);

        
      case 'addKegiatan':
        response = await axios.post(`${VM_API_BASE}/kegiatan`, {
          nama_kegiatan: data.namaKegiatan,
          narasumber_list: data.narasumberList,
          tgl_mulai: data.tglMulai,
          tgl_akhir: data.tglAkhir,
          tim_kerja: data.timKerja,
          tahun: data.tahun,
          tempat: data.tempat,
          penanggungjawab: data.penanggungjawab,
          status: 'Aktif',
          created_by: data.user ? (data.user.fullName || data.user.username) : ''
        });
        return res.json(response.data);

      case 'editKegiatan':
        response = await axios.put(`${VM_API_BASE}/kegiatan/${encodeURIComponent(data.oldNama)}`, {
          new_nama_kegiatan: data.newNama,
          narasumber_list: data.narasumberList,
          tgl_mulai: data.tglMulai,
          tgl_akhir: data.tglAkhir,
          tim_kerja: data.newTimKerja,
          tahun: data.newTahun,
          tempat: data.tempat,
          penanggungjawab: data.penanggungjawab
        });
        return res.json(response.data);

      case 'deleteKegiatan':
        response = await axios.delete(`${VM_API_BASE}/kegiatan/${encodeURIComponent(data.namaKegiatan)}`);
        return res.json(response.data);

      // -- Tim Kerja --
      case 'getTimKerjaAdmin':
        response = await axios.get(`${VM_API_BASE}/timkerja`);
        return res.json(response.data);

      case 'addTimKerja':
        response = await axios.post(`${VM_API_BASE}/timkerja`, { nama_tim: data.nama });
        return res.json(response.data);

      case 'editTimKerja':
        response = await axios.put(`${VM_API_BASE}/timkerja/${encodeURIComponent(data.oldNama)}`, { newName: data.newNama });
        return res.json(response.data);

      case 'deleteTimKerja':
        response = await axios.delete(`${VM_API_BASE}/timkerja/${encodeURIComponent(data.nama)}`);
        return res.json(response.data);

      // -- Instrumen --
      case 'getInstrumenAdmin':
        response = await axios.get(`${VM_API_BASE}/instrumen`);
        return res.json(response.data);

      case 'saveInstrumenAdmin':
        response = await axios.post(`${VM_API_BASE}/instrumen`, {
          tipe_evaluasi: data.tipe_evaluasi,
          pertanyaan_json: data.pertanyaan_json
        });
        return res.json(response.data);

      // -- Modul Laporan --
      case 'generateLaporan':
      case 'generateLaporanDocs':
        // Ini tidak di wa_sender melainkan controller lokal kita
        return laporanController.generateLaporan({ body: data }, res);

      // -- Modul AI --
      case 'rangkumSaran':
        return aiController.rangkumSaran({ body: data }, res);
      
      case 'rangkumSemuaSaran':
        return aiController.rangkumSemua({ body: data }, res);

      case 'getSemuaSaranMentah':
        return aiController.getSemuaSaranMentah({ query: data }, res);

      default:
        return res.status(400).json({ success: false, error: 'Unknown action: ' + action });
    }
  } catch(e) {
    console.error(`[API Action Error - ${action}]:`, e.response?.data || e.message);
    res.json({ success: false, error: e.response?.data?.error || e.message });
  }
});

module.exports = router;
