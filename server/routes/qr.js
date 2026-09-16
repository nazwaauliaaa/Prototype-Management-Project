import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Helper pembersih kode pencarian QR
function sanitizeCode(code) {
  if (!code) return '';
  return code.trim();
}

/**
 * Helper untuk memastikan tabel users memiliki data seed awal jika masih kosong
 */
async function ensureDefaultUsers() {
  try {
    const check = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(check.rows[0].count, 10) === 0) {
      const seedQuery = `
        INSERT INTO users (id, name, role, title, jobdesk, email, avatar, workspace_access)
        VALUES 
          ('usr-001', 'Dr. Hendra Wijaya', 'admin', 'Admin & Managing Director', 'Direktur Eksekutif & Manajemen Operasional', 'hendra.wijaya@sampulkreativ.id', '', '["ruangkreasi", "layarbaca"]'::jsonb),
          ('usr-002', 'Sari Rahmawati', 'manajement-project', 'Project Manager', 'Lead Operasional & Sprint Coordinator', 'sari.rahmawati@sampulkreativ.id', '', '["ruangkreasi", "layarbaca"]'::jsonb),
          ('usr-003', 'Budi Pratama', 'qa', 'QA Lead', 'Quality Assurance & Kelaikan Deliverable', 'budi.pratama@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb),
          ('usr-004', 'Dimas Anggara', 'user', 'Creative Specialist', 'Desain Grafis & Konten Visual 3D', 'dimas.anggara@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, '{\n  "nama": "Dimas Anggara",\n  "role": "User",\n  "jobdesk": "Desain Grafis & Konten Visual 3D"\n}'),
          ('usr-005', 'Rizky Firmansyah', 'user', 'UI/UX Designer', 'Perancangan Antarmuka & Prototipe Web', 'rizky.firmansyah@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, '{\n  "nama": "Rizky Firmansyah",\n  "role": "User",\n  "jobdesk": "Perancangan Antarmuka & Prototipe Web"\n}'),
          ('usr-006', 'Dewi Sartika', 'user', 'Content Strategist', 'Penulisan Naskah & Strategi Publikasi', 'dewi.sartika@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, '{\n  "nama": "Dewi Sartika",\n  "role": "User",\n  "jobdesk": "Penulisan Naskah & Strategi Publikasi"\n}'),
          ('usr-352837', 'Muhamad Fazli Esfandiar', 'user', 'Web development', 'Web development', 'muhamad.fazli.esfandiar@sampulkreativ.id', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muhamad%20Fazli%20Esfandiar', '["ruangkreasi", "panen-kunci", "layarbaca"]'::jsonb, '{\n  "nama": "Muhamad Fazli Esfandiar",\n  "role": "User",\n  "jobdesk": "Web development"\n}'),
          ('usr-admin-fazli', 'Muhamad Fazli Esfandiar', 'admin', 'System Administrator & Lead Developer', 'Administrator', 'muhamad.fazli.admin@sampulkreativ.id', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muhamad%20Fazli%20Esfandiar%20Admin', '["ruangkreasi", "layarbaca", "aikreativ", "panen-kunci", "sharinginaja"]'::jsonb, '{\n  "nama": "Muhamad Fazli Esfandiar",\n  "role": "Admin",\n  "jobdesk": "Administrator"\n}')
        ON CONFLICT (id) DO UPDATE SET
          qr_data = EXCLUDED.qr_data,
          jobdesk = EXCLUDED.jobdesk,
          updated_at = NOW();
      `;
      await pool.query(seedQuery);
    }
  } catch (err) {
    // Tabel users mungkin belum dibuat di database lokal
    console.warn('[QR Router] Peringatan seed users:', err.message);
  }
}

// Jalankan seed awal saat rute dimuat
ensureDefaultUsers();

// Helper ekstraksi data pengguna dari payload QR (fleksibel nama/Nama, role/Role, jobdesk/Jobdesk)
function extractUserFromPayload(raw) {
  if (!raw) return null;
  let parsed = null;
  if (typeof raw === 'object') {
    parsed = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {}
    } else if (trimmed.includes(':')) {
      // Dukung format plain-text berbaris "Key: Value", misalnya:
      // Nama: Muhamad Fazli Esfandiar
      // Role: Admin
      // Jobdesk: Web development
      parsed = {};
      const lines = trimmed.split(/[\r\n,]+/);
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const k = line.slice(0, colonIdx).trim();
          const v = line.slice(colonIdx + 1).trim();
          if (k && v) parsed[k] = v;
        }
      }
    }
  }

  if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) return null;

  const getKey = (keys) => {
    for (const k of keys) {
      for (const key of Object.keys(parsed)) {
        if (key.toLowerCase() === k.toLowerCase() && parsed[key]) {
          return String(parsed[key]).trim();
        }
      }
    }
    return null;
  };

  const name = getKey(['name', 'nama']);
  const role = getKey(['role', 'peran']) || 'user';
  const jobdesk = getKey(['jobdesk', 'job', 'title', 'jabatan', 'posisi']) || 'Web development';
  const id = getKey(['id', 'userid', 'user_id']);
  const isFazli = name && name.toLowerCase().includes('fazli');
  const finalId = id || (isFazli ? (role.toLowerCase() === 'admin' ? 'usr-admin-fazli' : 'usr-352837') : `usr-${Date.now().toString().slice(-6)}`);
  const email = getKey(['email']) || (name ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}${role.toLowerCase() === 'admin' ? '.admin' : ''}@sampulkreativ.id` : null);
  const avatar = getKey(['avatar']);

  if (name) {
    return {
      id: finalId,
      name,
      role: role.toLowerCase(),
      jobdesk,
      title: jobdesk,
      email,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + (role.toLowerCase() === 'admin' ? ' Admin' : ''))}`
    };
  }
  return null;
}

/**
 * POST /api/qr/register-user
 * Otomatis mendaftarkan akun baru ke Supabase dan mengunci akses hanya ke perangkat yang mendaftar
 */
router.post('/register-user', async (req, res) => {
  try {
    const extracted = extractUserFromPayload(req.body) || {};
    const name = extracted.name || req.body.name || req.body.Nama;
    const role = (extracted.role || req.body.role || req.body.Role || 'user').toLowerCase();
    const jobdesk = extracted.jobdesk || req.body.jobdesk || req.body.Jobdesk || 'Anggota Tim & Kontributor';
    const title = extracted.title || req.body.title || jobdesk;
    const email = extracted.email || req.body.email || (name ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id` : '');
    const avatar = extracted.avatar || req.body.avatar || (name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` : '');
    const userId = extracted.id || req.body.id || `usr-${Date.now().toString().slice(-6)}`;
    const qrData = req.body.qr_data || req.body.rawCode || extracted.qr_data || (typeof req.body === 'string' ? req.body : null);
    
    // Perangkat pengakses
    const deviceId = req.body.deviceId || req.headers['x-device-id'] || null;
    const deviceName = req.body.deviceName || req.headers['user-agent']?.slice(0, 100) || 'Perangkat Utama';
    const forceUnbind = Boolean(req.body.forceUnbind);

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama pengguna wajib diisi dari QR' });
    }

    // 1. Cek apakah user sudah terdaftar di Supabase / PostgreSQL
    const checkUserQuery = `
      SELECT * FROM users 
      WHERE id = $1 
         OR (LOWER(name) = LOWER($2) AND LOWER(role) = LOWER($3)) 
         OR (email IS NOT NULL AND LOWER(email) = LOWER($4))
         OR ($5::text IS NOT NULL AND qr_data = $5::text)
      LIMIT 1
    `;
    const checkUserRes = await pool.query(checkUserQuery, [userId, name, role, email, qrData]);

    if (checkUserRes.rows.length > 0) {
      const existing = checkUserRes.rows[0];
      const boundDevId = existing.bound_device_id;
      const boundDevName = existing.bound_device_name || 'Perangkat Lain';

      // SINGLE DEVICE LOCK: Jika akun sudah terikat perangkat lain dan deviceId berbeda
      if (boundDevId && deviceId && boundDevId !== deviceId && !forceUnbind) {
        return res.status(403).json({
          success: false,
          locked: true,
          error: `Akses ditolak: Akun "${existing.name}" sudah terhubung di perangkat "${boundDevName}". Perangkat lain tidak dapat mengakses akun ini!`,
          boundDeviceName: boundDevName,
          boundAt: existing.bound_at,
          data: {
            id: existing.id,
            name: existing.name,
            role: existing.role,
            boundDeviceName: boundDevName
          }
        });
      }

      // Ikat perangkat saat ini (atau perbarui)
      const updateQuery = `
        UPDATE users 
        SET bound_device_id = COALESCE($1, bound_device_id),
            bound_device_name = COALESCE($2, bound_device_name),
            bound_at = CASE WHEN bound_device_id IS NULL OR bound_device_id != $1 THEN NOW() ELSE bound_at END,
            name = COALESCE($3, name),
            jobdesk = COALESCE($4, jobdesk),
            title = COALESCE($4, title),
            email = COALESCE($5, email),
            avatar = COALESCE($6, avatar),
            qr_data = COALESCE($8, qr_data),
            updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
      const updateRes = await pool.query(updateQuery, [deviceId, deviceName, name, jobdesk, email, avatar, existing.id, qrData]);
      const savedUser = updateRes.rows[0];

      return res.json({
        success: true,
        autoCreated: false,
        bound: true,
        message: `Akun "${savedUser.name}" berhasil terhubung dan terkunci di perangkat ini!`,
        data: savedUser
      });
    }

    // 2. Akun Baru: Masukkan ke Supabase dan kunci langsung ke perangkat ini
    const insertQuery = `
      INSERT INTO users (id, name, role, title, jobdesk, email, avatar, workspace_access, bound_device_id, bound_device_name, bound_at, is_locked_to_device, qr_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, NOW(), true, $11)
      RETURNING *
    `;

    const values = [
      userId,
      name,
      role,
      title,
      jobdesk,
      email,
      avatar,
      JSON.stringify(['ruangkreasi', 'panen-kunci']),
      deviceId,
      deviceName,
      qrData
    ];

    const result = await pool.query(insertQuery, values);
    const savedUser = result.rows[0];

    console.log(`[QR Router] ✅ Akun baru tersimpan di Supabase & terkunci ke perangkat: ${savedUser.name} (${deviceId})`);

    res.status(201).json({
      success: true,
      autoCreated: true,
      bound: true,
      message: `Akun "${savedUser.name}" berhasil tersimpan di Supabase dan terkunci khusus perangkat ini!`,
      data: savedUser
    });
  } catch (err) {
    console.error('Error in /api/qr/register-user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/qr/unbind-device
 * Melepaskan kunci perangkat (logout dari perangkat) agar bisa dipindahkan jika diizinkan
 */
router.post('/unbind-device', async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Parameter userId wajib disertakan' });
    }

    const query = `
      UPDATE users 
      SET bound_device_id = NULL, bound_device_name = NULL, bound_at = NULL, updated_at = NOW()
      WHERE id = $1 AND (bound_device_id = $2 OR $2 IS NULL)
      RETURNING id, name
    `;
    const result = await pool.query(query, [userId, deviceId || null]);

    if (result.rows.length > 0) {
      return res.json({
        success: true,
        message: `Kunci perangkat untuk akun "${result.rows[0].name}" berhasil dilepas.`
      });
    }

    res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan atau perangkat tidak sesuai' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/qr/lookup?code=...&deviceId=...
 * Mencari data proyek, tugas, atau pengguna di database PostgreSQL berdasarkan kode QR dengan pengecekan lock perangkat
 */
router.get('/lookup', async (req, res) => {
  try {
    const rawCode = req.query.code || req.query.q || '';
    const deviceId = req.query.deviceId || null;
    const deviceName = req.query.deviceName || 'Perangkat Ini';
    const code = sanitizeCode(rawCode);

    if (!code) {
      return res.status(400).json({ success: false, error: 'Parameter kode QR wajib disertakan' });
    }

    // A. Cek apakah pengguna sudah terdaftar di tabel users di database PostgreSQL
    try {
      const jsonUser = extractUserFromPayload(code);
      const jsonName = jsonUser ? jsonUser.name : null;
      const jsonRole = jsonUser ? jsonUser.role : null;
      const jsonEmail = jsonUser ? jsonUser.email : null;
      const jsonId = jsonUser ? jsonUser.id : null;

      const userQuery = `
        SELECT * FROM users 
        WHERE id = $1 
           OR qr_data = $1
           OR (qr_data IS NOT NULL AND qr_data ILIKE '%' || $1 || '%')
           OR (qr_data IS NOT NULL AND $1 ILIKE '%' || qr_data || '%')
           OR LOWER(name) = LOWER($1) 
           OR LOWER(email) = LOWER($1)
           OR ($2::text IS NOT NULL AND (
                id = $2::text 
                OR (LOWER(name) = LOWER($3::text) AND LOWER(role) = LOWER($4::text))
                OR (email IS NOT NULL AND LOWER(email) = LOWER($5::text))
              ))
        LIMIT 1
      `;
      const userResult = await pool.query(userQuery, [code, jsonId, jsonName, jsonRole, jsonEmail]);

      if (userResult.rows.length > 0) {
        const row = userResult.rows[0];

        // Cek single-device lock perangkat user yang sudah ada
        if (row.bound_device_id && deviceId && row.bound_device_id !== deviceId) {
          return res.status(403).json({
            success: false,
            locked: true,
            type: 'user',
            error: `Akses ditolak: Akun "${row.name}" sedang terhubung di perangkat "${row.bound_device_name || 'Perangkat Lain'}". Perangkat lain tidak diizinkan masuk!`,
            boundDeviceName: row.bound_device_name,
            boundAt: row.bound_at,
            data: row
          });
        }

        // Ikat perangkat saat ini jika belum terikat
        const updateRes = await pool.query(`
          UPDATE users 
          SET bound_device_id = COALESCE($1, bound_device_id),
              bound_device_name = COALESCE($2, bound_device_name),
              bound_at = CASE WHEN bound_device_id IS NULL THEN NOW() ELSE bound_at END,
              qr_data = COALESCE(qr_data, $4),
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `, [deviceId, deviceName, row.id, code]);

        const savedUser = updateRes.rows[0];

        return res.json({
          success: true,
          type: 'user',
          found: true,
          autoCreated: false,
          bound: true,
          matchedBy: 'database-users',
          data: savedUser
        });
      }
    } catch (userErr) {
      console.warn('Tabel users belum siap atau error query:', userErr.message);
    }

    // C. Cek apakah ada di tabel projects
    const projectQuery = `
      SELECT * FROM projects 
      WHERE id = $1 
         OR LOWER(code) = LOWER($1) 
         OR LOWER(name) = LOWER($1)
         OR $1 ILIKE '%' || id || '%'
         OR (code IS NOT NULL AND $1 ILIKE '%' || code || '%')
      LIMIT 1
    `;
    const projectResult = await pool.query(projectQuery, [code]);

    if (projectResult.rows.length > 0) {
      const row = projectResult.rows[0];
      return res.json({
        success: true,
        type: 'project',
        matchedBy: 'projects',
        data: {
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description || '',
          workspace: row.workspace || 'ruangkreasi',
          status: row.status || 'active',
          type: row.type || 'existing',
          progress: row.progress || 0,
          priority: row.priority || 'Medium',
          startDate: row.start_date || '',
          dueDate: row.due_date || '',
          budget: row.budget || '',
          members: row.members || [],
          tasksCount: row.tasks_count || { total: 0, completed: 0 },
          theme: row.theme || null,
          createdAt: row.created_at
        }
      });
    }

    // D. Cek apakah ada di tabel tasks
    const taskQuery = `
      SELECT * FROM tasks 
      WHERE id = $1 
         OR LOWER(code) = LOWER($1) 
         OR LOWER(title) = LOWER($1)
         OR $1 ILIKE '%' || id || '%'
         OR (code IS NOT NULL AND $1 ILIKE '%' || code || '%')
      LIMIT 1
    `;
    const taskResult = await pool.query(taskQuery, [code]);

    if (taskResult.rows.length > 0) {
      const row = taskResult.rows[0];
      return res.json({
        success: true,
        type: 'task',
        matchedBy: 'tasks',
        data: {
          id: row.id,
          code: row.code,
          title: row.title,
          description: row.description || '',
          workspace: row.workspace || 'ruangkreasi',
          board: row.board || 'kampanye-q3',
          status: row.status || 'in-progress',
          priority: row.priority || 'Medium',
          pic: row.pic || { name: 'Sari Rahmawati', avatar: '', initials: 'SR' },
          timeline: row.timeline || '',
          hours: parseFloat(row.hours) || 0,
          assets: row.assets || [],
          qaProgress: row.qa_progress || { passed: 0, total: 4 },
          isStarred: Boolean(row.is_starred),
          tags: row.tags || [],
          location: row.location || '',
          projectId: row.project_id || null,
          createdAt: row.created_at
        }
      });
    }

    // Tidak ditemukan di PostgreSQL
    return res.status(404).json({
      success: false,
      found: false,
      error: `Kode QR "${code}" tidak ditemukan di database PostgreSQL`
    });
  } catch (err) {
    console.error('Error in /api/qr/lookup:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/qr/all
 * Mengambil ringkasan semua proyek, tugas, dan pengguna untuk katalog QR di database
 */
router.get('/all', async (req, res) => {
  try {
    const projectsResult = await pool.query('SELECT id, code, name, status, progress, workspace FROM projects ORDER BY created_at DESC');
    const tasksResult = await pool.query('SELECT id, code, title, status, priority, workspace, board, pic FROM tasks ORDER BY created_at DESC');
    
    let usersResult = { rows: [] };
    try {
      usersResult = await pool.query('SELECT id, name, role, title, jobdesk, email FROM users ORDER BY created_at DESC');
    } catch {}

    const qrItems = [
      ...projectsResult.rows.map(p => ({
        id: p.id,
        code: p.code || p.id,
        title: p.name,
        type: 'project',
        status: p.status,
        progress: p.progress,
        workspace: p.workspace,
        qrPayload: JSON.stringify({ type: 'project', id: p.id, code: p.code })
      })),
      ...tasksResult.rows.map(t => ({
        id: t.id,
        code: t.code || t.id,
        title: t.title,
        type: 'task',
        status: t.status,
        priority: t.priority,
        workspace: t.workspace,
        board: t.board,
        pic: t.pic,
        qrPayload: JSON.stringify({ type: 'task', id: t.id, code: t.code })
      })),
      ...usersResult.rows.map(u => ({
        id: u.id,
        code: u.id,
        title: u.name,
        type: 'user',
        role: u.role,
        jobdesk: u.jobdesk || u.title,
        email: u.email,
        qrPayload: JSON.stringify({ type: 'user', role: u.role || 'user', id: u.id, name: u.name, jobdesk: u.jobdesk || u.title })
      }))
    ];

    res.json({
      success: true,
      count: qrItems.length,
      projectsCount: projectsResult.rows.length,
      tasksCount: tasksResult.rows.length,
      usersCount: usersResult.rows.length,
      data: qrItems
    });
  } catch (err) {
    console.error('Error in /api/qr/all:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
