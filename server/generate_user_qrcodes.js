import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'public', 'qrcodes');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateAllUserQRs() {
  try {
    const res = await pool.query("SELECT id, name, role, title, jobdesk, email, qr_data FROM users ORDER BY id ASC");
    console.log(`Ditemukan ${res.rows.length} akun di database:`);

    for (const u of res.rows) {
      const roleCapitalized = (u.role || 'User').charAt(0).toUpperCase() + (u.role || 'User').slice(1);
      const payload = u.qr_data || JSON.stringify({
        nama: u.name,
        role: roleCapitalized,
        jobdesk: u.jobdesk || u.title || "Creative Staff"
      }, null, 2);

      const safeName = u.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const roleSuffix = `_${(u.role || 'user').toLowerCase()}`;
      const svgPath = path.join(outputDir, `qr_${safeName}${roleSuffix}.svg`);
      const pngPath = path.join(outputDir, `qr_${safeName}${roleSuffix}.png`);

      // 1. Generate SVG
      const svgString = await QRCode.toString(payload, {
        type: 'svg',
        margin: 2,
        color: {
          dark: u.role === 'admin' ? '#78350f' : '#0f172a',
          light: '#ffffff'
        }
      });
      fs.writeFileSync(svgPath, svgString, 'utf8');

      // 2. Generate PNG Data / File
      await QRCode.toFile(pngPath, payload, {
        type: 'png',
        margin: 2,
        width: 320,
        color: {
          dark: u.role === 'admin' ? '#78350f' : '#0f172a',
          light: '#ffffff'
        }
      });

      // Also copy as standard default if role is user or admin
      if (u.role === 'user') {
        fs.writeFileSync(path.join(outputDir, `qr_${safeName}.svg`), svgString, 'utf8');
        await QRCode.toFile(path.join(outputDir, `qr_${safeName}.png`), payload, {
          type: 'png',
          margin: 2,
          width: 320,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      }

      console.log(`✅ [${u.name}] [${(u.role || '').toUpperCase()}] (${u.jobdesk}) -> Disimpan:`);
      console.log(`   - SVG: public/qrcodes/qr_${safeName}${roleSuffix}.svg`);
      console.log(`   - PNG: public/qrcodes/qr_${safeName}${roleSuffix}.png`);
    }

    console.log('\n🎉 Semua QR Code berhasil dibuat!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

generateAllUserQRs();
