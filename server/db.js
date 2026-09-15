import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat konfigurasi dari file .env di direktori server
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

// Konfigurasi koneksi
const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl = 
  process.env.DB_SSL === 'true' || 
  (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase')));

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'creative_office',
      ssl: requiresSsl ? { rejectUnauthorized: false } : false
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

/**
 * Tes koneksi ke database
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    client.release();
    return {
      connected: true,
      database: res.rows[0].current_database,
      user: res.rows[0].current_user,
      version: res.rows[0].version
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message
    };
  }
}
