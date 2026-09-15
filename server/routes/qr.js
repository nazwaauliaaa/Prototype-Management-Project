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
          ('usr-004', 'Dimas Anggara', 'user', 'Creative Specialist', 'Desain Grafis & Konten Visual 3D', 'dimas.anggara@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb),
          ('usr-005', 'Rizky Firmansyah', 'user', 'UI/UX Designer', 'Perancangan Antarmuka & Prototipe Web', 'rizky.firmansyah@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb),
          ('usr-006', 'Dewi Sartika', 'user', 'Content Strategist', 'Penulisan Naskah & Strategi Publikasi', 'dewi.sartika@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb)
        ON CONFLICT (id) DO NOTHING;
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

/**
 * POST /api/qr/register-user
 * Otomatis mendaftarkan akun baru ke database PostgreSQL dari data QR
 */
router.post('/register-user', async (req, res) => {
  try {
    const { name, role = 'user', jobdesk = 'Anggota Tim & Kontributor', title, email, avatar } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama pengguna wajib diisi' });
    }

    const userId = req.body.id || `usr-${Date.now().toString().slice(-6)}`;
    const userTitle = title || jobdesk;
    const cleanEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`;
    const userAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    const insertQuery = `
      INSERT INTO users (id, name, role, title, jobdesk, email, avatar, workspace_access)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name, 
            role = EXCLUDED.role, 
            jobdesk = EXCLUDED.jobdesk,
            title = EXCLUDED.title,
            updated_at = NOW()
      RETURNING *
    `;

    const values = [
      userId,
      name,
      role.toLowerCase(),
      userTitle,
      jobdesk,
      cleanEmail,
      userAvatar,
      JSON.stringify(['ruangkreasi', 'layarbaca'])
    ];

    const result = await pool.query(insertQuery, values);
    const savedUser = result.rows[0];

    console.log(`[QR Router] ✅ Akun baru otomatis dibuat via QR: ${savedUser.name} (${savedUser.jobdesk})`);

    res.status(201).json({
      success: true,
      autoCreated: true,
      message: `Akun baru "${savedUser.name}" berhasil dibuat otomatis di database!`,
      data: savedUser
    });
  } catch (err) {
    console.error('Error in /api/qr/register-user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/qr/lookup?code=...
 * Mencari data proyek, tugas, atau pengguna di database PostgreSQL berdasarkan kode QR
 */
router.get('/lookup', async (req, res) => {
  try {
    const rawCode = req.query.code || req.query.q || '';
    const code = sanitizeCode(rawCode);

    if (!code) {
      return res.status(400).json({ success: false, error: 'Parameter kode QR wajib disertakan' });
    }

    // A. Periksa apakah kode QR berupa JSON yang membawa informasi User
    let jsonUser = null;
    try {
      if (code.startsWith('{') && code.endsWith('}')) {
        const parsed = JSON.parse(code);
        if (parsed.role && parsed.role.toLowerCase() === 'user' || parsed.type === 'user') {
          jsonUser = parsed;
        }
      }
    } catch {}

    // Jika QR secara eksplisit memuat data user, otomatis buat/sinkronkan akun baru di database
    if (jsonUser && jsonUser.name) {
      const newId = jsonUser.id || `usr-${Date.now().toString().slice(-6)}`;
      const jobdesk = jsonUser.jobdesk || jsonUser.title || 'Creative Staff';
      const email = jsonUser.email || `${jsonUser.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`;

      try {
        const insertQuery = `
          INSERT INTO users (id, name, role, title, jobdesk, email, avatar, workspace_access)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          ON CONFLICT (id) DO UPDATE 
            SET name = EXCLUDED.name, 
                jobdesk = EXCLUDED.jobdesk,
                updated_at = NOW()
          RETURNING *
        `;
        const result = await pool.query(insertQuery, [
          newId,
          jsonUser.name,
          'user',
          jobdesk,
          jobdesk,
          email,
          jsonUser.avatar || '',
          JSON.stringify(['ruangkreasi'])
        ]);

        return res.json({
          success: true,
          type: 'user',
          autoCreated: true,
          matchedBy: 'qr-json-auto-create',
          data: result.rows[0]
        });
      } catch (dbErr) {
        console.warn('Gagal simpan user ke pg, mengembalikan payload json:', dbErr.message);
        return res.json({
          success: true,
          type: 'user',
          autoCreated: true,
          matchedBy: 'qr-json-local',
          data: {
            id: newId,
            name: jsonUser.name,
            role: 'user',
            title: jobdesk,
            jobdesk: jobdesk,
            email: email
          }
        });
      }
    }

    // B. Cek apakah ada di tabel users di database PostgreSQL
    try {
      const userQuery = `
        SELECT * FROM users 
        WHERE id = $1 
           OR LOWER(name) = LOWER($1) 
           OR LOWER(email) = LOWER($1)
           OR $1 ILIKE '%' || id || '%'
           OR $1 ILIKE '%' || name || '%'
        LIMIT 1
      `;
      const userResult = await pool.query(userQuery, [code]);

      if (userResult.rows.length > 0) {
        const row = userResult.rows[0];
        const isUserRole = (row.role || '').toLowerCase() === 'user';

        return res.json({
          success: true,
          type: 'user',
          autoCreated: isUserRole,
          matchedBy: 'database-users',
          data: {
            id: row.id,
            name: row.name,
            role: row.role || 'user',
            title: row.title || row.jobdesk,
            jobdesk: row.jobdesk || row.title || 'Anggota Tim & Kontributor',
            email: row.email,
            avatar: row.avatar || '',
            workspaceAccess: row.workspace_access || ['ruangkreasi'],
            createdAt: row.created_at
          }
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
