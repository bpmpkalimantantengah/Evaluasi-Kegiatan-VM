const db = require('../config/db');

exports.getSemuaKegiatan = async (req, res) => {
    try {
        const query = `
            SELECT m.*, 
                   COUNT(DISTINCT r.nama_peserta) AS totalRes 
            FROM kegiatan_meta m 
            LEFT JOIN evaluasi_respons r ON m.nama_kegiatan = r.nama_kegiatan
            GROUP BY m.nama_kegiatan
            ORDER BY m.updated_at DESC
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error getSemuaKegiatan:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.migrateKegiatan = async (req, res) => {
    try {
        const payload = req.body;
        if (!Array.isArray(payload)) return res.status(400).json({ error: 'Payload harus berupa array' });
        
        let inserted = 0;
        for (const data of payload) {
            const { nama_kegiatan, kode_unik, tim_kerja, tahun, tempat, penanggungjawab, status, created_by, tgl_import, tgl_mulai, tgl_akhir, narasumber_list, avgK, avgS, avgN, respondK, respondS, respondN } = data;
            if (!nama_kegiatan) continue;
            
            await db.query(
                `INSERT INTO kegiatan_meta (nama_kegiatan, kode_unik, tim_kerja, tahun, tempat, penanggungjawab, status, created_by, tgl_import, tgl_mulai, tgl_akhir, narasumber_list, avgK, avgS, avgN, respondK, respondS, respondN) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 tim_kerja=VALUES(tim_kerja), tahun=VALUES(tahun), tempat=VALUES(tempat), penanggungjawab=VALUES(penanggungjawab), status=VALUES(status), created_by=VALUES(created_by), tgl_import=VALUES(tgl_import), tgl_mulai=VALUES(tgl_mulai), tgl_akhir=VALUES(tgl_akhir), narasumber_list=VALUES(narasumber_list), avgK=VALUES(avgK), avgS=VALUES(avgS), avgN=VALUES(avgN), respondK=VALUES(respondK), respondS=VALUES(respondS), respondN=VALUES(respondN)`,
                [nama_kegiatan, kode_unik || null, tim_kerja || null, tahun || null, tempat || null, penanggungjawab || null, status || 'Aktif', created_by || null, tgl_import || null, tgl_mulai || null, tgl_akhir || null, narasumber_list || null, avgK || 0, avgS || 0, avgN || 0, respondK || 0, respondS || 0, respondN || 0]
            );
            inserted++;
        }
        res.json({ success: true, message: `Berhasil memigrasikan ${inserted} kegiatan` });
    } catch (error) {
        console.error("Error migrateKegiatan:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.getTimKerja = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT nama_tim FROM tim_kerja ORDER BY nama_tim ASC');
        res.json({ success: true, data: rows.map(r => r.nama_tim) });
    } catch (error) {
        console.error("Error getTimKerja:", error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
};

exports.addTimKerja = async (req, res) => {
    try {
        const { nama_tim } = req.body;
        if (!nama_tim) return res.status(400).json({ error: 'Nama tim wajib diisi' });
        await db.query('INSERT INTO tim_kerja (nama_tim) VALUES (?)', [nama_tim]);
        res.json({ success: true, message: 'Tim kerja berhasil ditambahkan' });
    } catch (error) {
        console.error("Error addTimKerja:", error);
        res.status(500).json({ error: 'Gagal menambah tim kerja' });
    }
};

exports.editTimKerja = async (req, res) => {
    try {
        const oldName = decodeURIComponent(req.params.oldName);
        const { newName } = req.body;
        if (!newName) return res.status(400).json({ error: 'Nama tim baru wajib diisi' });
        await db.query('UPDATE tim_kerja SET nama_tim = ? WHERE nama_tim = ?', [newName, oldName]);
        res.json({ success: true, message: 'Tim kerja berhasil diubah' });
    } catch (error) {
        console.error("Error editTimKerja:", error);
        res.status(500).json({ error: 'Gagal mengubah tim kerja' });
    }
};

exports.deleteTimKerja = async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        await db.query('DELETE FROM tim_kerja WHERE nama_tim = ?', [name]);
        res.json({ success: true, message: 'Tim kerja berhasil dihapus' });
    } catch (error) {
        console.error("Error deleteTimKerja:", error);
        res.status(500).json({ error: 'Gagal menghapus tim kerja' });
    }
};

exports.createKegiatan = async (req, res) => {
    try {
        let { nama_kegiatan, narasumber_list, tgl_mulai, tgl_akhir, kode_unik, tim_kerja, tahun, tempat, penanggungjawab, status, created_by, tgl_import } = req.body;
        if (!nama_kegiatan) return res.status(400).json({ error: 'Nama kegiatan wajib diisi' });
        
        if (!kode_unik) {
            kode_unik = require('crypto').randomBytes(3).toString('hex').toUpperCase();
        }

        await db.query(
            `INSERT INTO kegiatan_meta (nama_kegiatan, kode_unik, narasumber_list, tgl_mulai, tgl_akhir, tim_kerja, tahun, tempat, penanggungjawab, status, created_by, tgl_import) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE kode_unik = VALUES(kode_unik), narasumber_list = VALUES(narasumber_list), tgl_mulai = VALUES(tgl_mulai), tgl_akhir = VALUES(tgl_akhir), tim_kerja = VALUES(tim_kerja), tahun = VALUES(tahun), tempat = VALUES(tempat), penanggungjawab = VALUES(penanggungjawab), status = VALUES(status), created_by = VALUES(created_by), tgl_import = VALUES(tgl_import)`,
            [nama_kegiatan, kode_unik, narasumber_list || null, tgl_mulai || null, tgl_akhir || null, tim_kerja || null, tahun || null, tempat || null, penanggungjawab || null, status || 'Aktif', created_by || null, tgl_import || null]
        );
        res.json({ success: true, message: 'Metadata kegiatan berhasil disimpan.' });
    } catch (error) {
        console.error("Error createKegiatan:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.getKegiatan = async (req, res) => {
    try {
        const nama_kegiatan = decodeURIComponent(req.params.id);
        
        // Ambil meta kegiatan
        const [meta] = await db.query('SELECT kode_unik, narasumber_list, tgl_mulai, tgl_akhir FROM kegiatan_meta WHERE nama_kegiatan = ?', [nama_kegiatan]);
        let narasumberList = [];
        let tglMulai = null, tglAkhir = null, kodeUnik = null;
        if (meta.length > 0) {
            kodeUnik = meta[0].kode_unik;
            if (meta[0].narasumber_list) {
                narasumberList = meta[0].narasumber_list.split(';').map(s => s.trim()).filter(Boolean);
            }
            tglMulai = meta[0].tgl_mulai;
            tglAkhir = meta[0].tgl_akhir;
        }

        // Ambil instrumen
        const [instrumenRows] = await db.query('SELECT tipe_evaluasi, pertanyaan_json FROM instrumen_config');
        const instrumen = {};
        instrumenRows.forEach(row => {
            instrumen[row.tipe_evaluasi] = row.pertanyaan_json;
        });

        res.json({ 
            success: true, 
            data: { 
                nama_kegiatan: nama_kegiatan,
                kode_unik: kodeUnik,
                narasumber_list: narasumberList,
                tgl_mulai: tglMulai,
                tgl_akhir: tglAkhir,
                instrumen: instrumen
            } 
        });
    } catch (error) {
        console.error("Error getKegiatan:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.submitEvaluasi = async (req, res) => {
    try {
        let payload = req.body;
        // Jika data adalah objek (1 evaluasi tunggal), ubah menjadi array
        if (!Array.isArray(payload)) {
            payload = [payload];
        }

        if (payload.length === 0) return res.status(400).json({ error: 'Tidak ada data evaluasi' });

        const kegiatan_id = payload[0].kegiatan_id;
        const nama_kegiatan = decodeURIComponent(kegiatan_id);

        let inserted = 0;
        const generatedTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        for (const data of payload) {
            const { tipe_evaluasi, nama_peserta, nama_narasumber, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, saran, tgl_submit } = data;
            
            if (!nama_kegiatan || !tipe_evaluasi) continue;

            let query = `INSERT INTO evaluasi_respons 
                 (nama_kegiatan, tipe_evaluasi, nama_peserta, nama_narasumber, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, saran, tgl_submit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            let params = [nama_kegiatan, tipe_evaluasi, nama_peserta, nama_narasumber || null, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, saran, tgl_submit || generatedTimestamp];

            await db.query(query, params);
            inserted++;
        }

        res.json({ success: true, message: `Berhasil menyimpan ${inserted} evaluasi` });
    } catch (error) {
        console.error("Error submitEvaluasi:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.getRekap = async (req, res) => {
    try {
        const nama_kegiatan = decodeURIComponent(req.params.id);
        const [respons] = await db.query('SELECT * FROM evaluasi_respons WHERE nama_kegiatan = ?', [nama_kegiatan]);
        res.json({ success: true, kegiatan: { nama_kegiatan }, data: respons });
    } catch (error) {
        console.error("Error getRekap:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.getInstrumen = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT tipe_evaluasi, pertanyaan_json FROM instrumen_config');
        const instrumen = {};
        rows.forEach(r => {
            instrumen[r.tipe_evaluasi] = r.pertanyaan_json;
        });
        res.json({ success: true, data: instrumen });
    } catch (error) {
        console.error("Error getInstrumen:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.saveInstrumen = async (req, res) => {
    try {
        const { tipe_evaluasi, pertanyaan_json } = req.body;
        if (!tipe_evaluasi || !pertanyaan_json) return res.status(400).json({ error: 'Data tidak lengkap' });

        await db.query(
            `INSERT INTO instrumen_config (tipe_evaluasi, pertanyaan_json) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE pertanyaan_json = VALUES(pertanyaan_json)`,
            [tipe_evaluasi, JSON.stringify(pertanyaan_json)]
        );
        res.json({ success: true, message: 'Instrumen berhasil disimpan' });
    } catch (error) {
        console.error("Error saveInstrumen:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.getAllCounts = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT nama_kegiatan, COUNT(*) as total FROM evaluasi_respons WHERE tipe_evaluasi = 'K' GROUP BY nama_kegiatan");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error getAllCounts:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.getResponden = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query("SELECT DISTINCT tgl_submit, nama_peserta FROM evaluasi_respons WHERE nama_kegiatan = ? AND tipe_evaluasi = 'K' ORDER BY tgl_submit DESC", [id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error getResponden:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};

exports.deleteKegiatan = async (req, res) => {
    try {
        const nama_kegiatan = decodeURIComponent(req.params.id);
        if (!nama_kegiatan) return res.status(400).json({ error: 'Nama kegiatan wajib diisi' });

        await db.query('DELETE FROM evaluasi_respons WHERE nama_kegiatan = ?', [nama_kegiatan]);
        await db.query('DELETE FROM kegiatan_meta WHERE nama_kegiatan = ?', [nama_kegiatan]);
        
        res.json({ success: true, message: 'Data kegiatan beserta seluruh respons evaluasi berhasil dihapus dari database.' });
    } catch (error) {
        console.error("Error deleteKegiatan:", error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menghapus kegiatan dari server' });
    }
};

exports.updateKegiatan = async (req, res) => {
    try {
        const old_nama_kegiatan = decodeURIComponent(req.params.old_id);
        const { new_nama_kegiatan, narasumber_list, tgl_mulai, tgl_akhir, tim_kerja, tahun, tempat, penanggungjawab } = req.body;
        
        if (!old_nama_kegiatan) return res.status(400).json({ error: 'Nama kegiatan lama wajib diisi' });
        
        const nama_baru = new_nama_kegiatan ? new_nama_kegiatan.trim() : old_nama_kegiatan.trim();
        
        if (old_nama_kegiatan !== nama_baru) {
            // Update the primary key in kegiatan_meta
            await db.query(
                `UPDATE kegiatan_meta SET nama_kegiatan = ?, narasumber_list = ?, tgl_mulai = ?, tgl_akhir = ?, tim_kerja = ?, tahun = ?, tempat = ?, penanggungjawab = ? WHERE nama_kegiatan = ?`,
                [nama_baru, narasumber_list || null, tgl_mulai || null, tgl_akhir || null, tim_kerja || null, tahun || null, tempat || null, penanggungjawab || null, old_nama_kegiatan]
            );
            
            // Update in evaluasi_respons
            await db.query(
                `UPDATE evaluasi_respons SET nama_kegiatan = ? WHERE nama_kegiatan = ?`,
                [nama_baru, old_nama_kegiatan]
            );
        } else {
            // Just update details
            await db.query(
                `UPDATE kegiatan_meta SET narasumber_list = ?, tgl_mulai = ?, tgl_akhir = ?, tim_kerja = ?, tahun = ?, tempat = ?, penanggungjawab = ? WHERE nama_kegiatan = ?`,
                [narasumber_list || null, tgl_mulai || null, tgl_akhir || null, tim_kerja || null, tahun || null, tempat || null, penanggungjawab || null, old_nama_kegiatan]
            );
        }

        res.json({ success: true, message: 'Data kegiatan berhasil diperbarui di database.' });
    } catch (error) {
        console.error("Error updateKegiatan:", error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui kegiatan di server' });
    }
};

exports.updateStats = async (req, res) => {
    try {
        const { nama_kegiatan, avgK, avgS, avgN, respondK, respondS, respondN } = req.body;
        if (!nama_kegiatan) return res.status(400).json({ error: 'Nama kegiatan wajib diisi' });

        await db.query(
            `UPDATE kegiatan_meta SET avgK=?, avgS=?, avgN=?, respondK=?, respondS=?, respondN=? WHERE nama_kegiatan=?`,
            [avgK||0, avgS||0, avgN||0, respondK||0, respondS||0, respondN||0, nama_kegiatan]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error updateStats:", error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
};

exports.resolveCode = async (req, res) => {
    try {
        const { kode } = req.params;
        if (!kode) return res.status(400).json({ error: 'Kode wajib diisi' });

        const [meta] = await db.query('SELECT nama_kegiatan FROM kegiatan_meta WHERE kode_unik = ?', [kode]);
        if (meta.length === 0) {
            return res.status(404).json({ error: 'Kode kegiatan tidak ditemukan' });
        }

        res.json({ success: true, nama_kegiatan: meta[0].nama_kegiatan });
    } catch (error) {
        console.error("Error resolveCode:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
};
