const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_EVALUASI_HOST || 'localhost',
  user: process.env.DB_EVALUASI_USER || 'root',
  password: process.env.DB_EVALUASI_PASSWORD || '',
  database: process.env.DB_EVALUASI_NAME || 'bpmp_evaluasi',
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+08:00',
});

module.exports = db;

