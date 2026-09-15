import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('----------------------------------------------------');
  console.log('🔄 Memeriksa koneksi database PostgreSQL...');
  
  const connStatus = await testConnection();
  if (!connStatus.connected) {
    console.error('❌ Gagal terhubung ke PostgreSQL!');
    console.error('Penyebab:', connStatus.error);
    console.log('\n💡 TIPS:');
    console.log('1. Pastikan PostgreSQL Anda sudah aktif (jika lokal).');
    console.log('2. Atau gunakan database cloud gratis di https://neon.tech lalu masukkan DATABASE_URL ke file server/.env');
    console.log('----------------------------------------------------');
    process.exit(1);
  }

  console.log(`✅ Terhubung ke database: "${connStatus.database}" sebagai user: "${connStatus.user}"`);
  console.log('📦 Menjalankan skrip inisialisasi tabel (schema.sql)...');

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('🎉 Tabel "projects" dan "tasks" berhasil dibuat/diverifikasi di PostgreSQL!');
  } catch (err) {
    console.error('❌ Gagal membuat tabel:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
  console.log('----------------------------------------------------');
}

initDatabase();
