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
  origin: '*', // Bisa diatur ke origin spesifik jika diinginkan
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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

app.listen(PORT, async () => {
  console.log(`\n🚀 Server backend berjalan di http://localhost:${PORT}`);
  console.log(`🔍 Memeriksa koneksi database PostgreSQL...`);
  const status = await testConnection();
  if (status.connected) {
    console.log(`✅ Sukses terhubung ke PostgreSQL: "${status.database}"`);
  } else {
    console.warn(`⚠️ Peringatan: Belum terhubung ke PostgreSQL: ${status.error}`);
    console.warn(`👉 Pastikan konfigurasi di server/.env sudah sesuai.\n`);
  }
});
