const db = require('./config/db');

async function createIndexes() {
  try {
    console.log("Adding indexes to kegiatan_meta...");
    await db.query("ALTER TABLE kegiatan_meta ADD INDEX idx_nama_kegiatan (nama_kegiatan);").catch(e => { if(e.code !== 'ER_DUP_KEYNAME') throw e; else console.log('Index idx_nama_kegiatan already exists'); });
    await db.query("ALTER TABLE kegiatan_meta ADD INDEX idx_kode_unik (kode_unik);").catch(e => { if(e.code !== 'ER_DUP_KEYNAME') throw e; else console.log('Index idx_kode_unik already exists'); });
    
    console.log("Adding indexes to evaluasi_respons...");
    await db.query("ALTER TABLE evaluasi_respons ADD INDEX idx_nama_kegiatan (nama_kegiatan);").catch(e => { if(e.code !== 'ER_DUP_KEYNAME') throw e; else console.log('Index idx_nama_kegiatan already exists'); });
    await db.query("ALTER TABLE evaluasi_respons ADD INDEX idx_tipe_evaluasi (tipe_evaluasi);").catch(e => { if(e.code !== 'ER_DUP_KEYNAME') throw e; else console.log('Index idx_tipe_evaluasi already exists'); });

    console.log("Database indexing completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  }
}

createIndexes();
