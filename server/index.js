import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './db.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import qrRoutes from './routes/qr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Endpoint Health Check & Status Koneksi Database
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Registrasi Routes
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/qr', qrRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: 'Terjadi kesalahan internal server' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Server backend berjalan di http://0.0.0.0:${PORT} (dapat diakses dari Desktop & Mobile LAN)`);
  console.log(`🔍 Memeriksa koneksi database PostgreSQL...`);
  const status = await testConnection();
  if (status.connected) {
    console.log(`✅ Sukses terhubung ke PostgreSQL: "${status.database}"`);
  } else {
    console.warn(`⚠️ PostgreSQL belum aktif (${status.error || 'No DB config'}).`);
    console.log(`📂 Menggunakan penyimpanan lokal fileStore (server/data/tasks.json) sebagai sinkronisasi desktop & mobile.`);
  }
});
