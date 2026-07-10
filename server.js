const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const axios = require('axios');
axios.interceptors.request.use(config => {
  if (config.url && config.url.includes('127.0.0.1:3000')) {
    config.headers['x-api-key'] = process.env.API_KEY || 'gaspol_secret_key_2026';
  }
  return config;
});

const app = express();
const PORT = process.env.PORT || 4001;

// Setup EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiter
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 300, // maksimal 300 request per IP
  message: { success: false, error: 'Terlalu banyak permintaan, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

const mysql = require('mysql2/promise');

// Pool Database untuk SSO
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'gaspol_portal',
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0
});

// Routes
app.use('/evaluasi/api', require('./routes/api'));

// Serve SPA Frontend
app.use(async (req, res) => {
  let token = req.query.token || '';
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
      const parts = c.trim().split('=');
      if (parts.length >= 2) acc[parts[0]] = parts[1];
      return acc;
    }, {});
    token = cookies['gaspol_token'] || '';
  }
  const appUrl = 'https://168-110-208-72.nip.io/evaluasi'; // Node.js VM endpoint (HTTPS)
  const appId = 'APP_B30A8869'; // ID App Evaluasi Kegiatan (VM) di Portal GASPOL
  
  let ssoUserStr = 'null';

  if (token) {
    try {
      const [rows] = await db.execute(
        `SELECT u.userId, u.username, u.fullName, u.role 
         FROM Sessions s 
         JOIN Users u ON s.userId = u.userId 
         WHERE s.token = ? AND s.isValid = 1 
         AND (s.expiresAt IS NULL OR s.expiresAt > NOW())`,
        [token]
      );
      if (rows.length > 0) {
        ssoUserStr = JSON.stringify(rows[0]);
      }
    } catch(e) { 
      console.error('SSO Database Error:', e.message); 
    }
  }
  
  res.render('index', {
    appUrl,
    appId,
    token,
    portalUrl: 'https://168-110-208-72.nip.io/portal/',
    ssoUser: ssoUserStr
  });
});


// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Evaluasi Kegiatan Server running on port ${PORT}`);
});
