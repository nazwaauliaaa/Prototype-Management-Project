import { pool } from './db.js';

async function migrate() {
  try {
    console.log('🔄 Menambahkan kolom device binding ke tabel users di Supabase...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bound_device_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bound_device_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bound_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked_to_device BOOLEAN DEFAULT true;
    `);
    console.log('✅ Kolom device binding berhasil dibuat di Supabase!');
    
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Kolom tabel users saat ini:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('❌ Error migration:', err);
  } finally {
    await pool.end();
  }
}

migrate();
