const mysql = require('mysql2/promise');
require('dotenv').config();

const dbSSO = mysql.createPool({
  host: process.env.DB_SSO_HOST || process.env.DB_EVALUASI_HOST || 'localhost',
  user: process.env.DB_SSO_USER || process.env.DB_EVALUASI_USER || 'root',
  password: process.env.DB_SSO_PASSWORD || process.env.DB_EVALUASI_PASSWORD || '',
  database: process.env.DB_SSO_NAME || 'gaspol_portal',
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+08:00',
});

module.exports = dbSSO;

