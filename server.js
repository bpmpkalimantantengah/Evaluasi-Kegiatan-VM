const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
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

// CORS — hanya izinkan dari domain GASPOL yang dikenal
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      undefined,             // server-to-server (no origin)
      'http://localhost',
      'http://127.0.0.1',
      'http://168.110.208.72',
      'https://168.110.208.72',
      'https://168-110-208-72.nip.io',
    ];
    if (!origin || allowed.some(a => a && origin.startsWith(a))) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin tidak diizinkan — ' + origin));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Percayai reverse proxy (Nginx/LB) agar IP client asli terbaca untuk rate limiter
app.set('trust proxy', 1);

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
      const appId = process.env.APP_ID || '';
      const [rows] = await db.execute(
        `SELECT u.userId, u.username, u.fullName, UPPER(IFNULL(a.appRole, u.role)) AS role 
         FROM Sessions s 
         JOIN Users u ON s.userId = u.userId 
         LEFT JOIN AppAccess a ON u.userId = a.userId AND a.appId = ?
         WHERE s.token = ? AND s.isValid = 1 
         AND (s.expiresAt IS NULL OR s.expiresAt > NOW())`,
        [appId, token]
      );
      if (rows.length > 0) {
        ssoUserStr = JSON.stringify(rows[0]);
      }
    } catch(e) { 
      console.error('SSO Database Error:', e.message); 
    }
  }

  let appName = 'EVALUASI KEGIATAN';
  try {
    const [rows] = await db.execute('SELECT appName FROM Apps WHERE appId = ?', [appId]);
    if (rows.length > 0) appName = rows[0].appName;
  } catch(e) {
    console.error('AppName Error:', e.message);
  }
  
  res.render('index', {
    appUrl,
    appId,
    appName,
    token,
    portalUrl: 'https://168-110-208-72.nip.io/portal/',
    ssoUser: ssoUserStr
  });
});


// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Evaluasi Kegiatan Server running on port ${PORT}`);
});
