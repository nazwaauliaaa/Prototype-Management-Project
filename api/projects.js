// Vercel Serverless Function untuk /api/projects
// Menyimpan proyek ke PostgreSQL (Supabase) dengan fallback in-memory

let pgPool = null;
let inMemoryProjects = [];

// Helper: dapatkan koneksi PostgreSQL
async function getPool() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_URL;
  if (!connStr) return null;
  if (pgPool) return pgPool;
  try {
    const { default: pg } = await import('pg');
    pgPool = new pg.Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 3
    });
    return pgPool;
  } catch (e) {
    console.warn('[api/projects] Gagal inisialisasi pg pool:', e.message);
    return null;
  }
}

// Helper: format row PostgreSQL ke format frontend
function formatProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    workspace: row.workspace || 'panen-kunci',
    status: row.status || 'active',
    type: row.type || 'existing',
    progress: Number(row.progress) || 0,
    priority: row.priority || 'Medium',
    startDate: row.start_date || '',
    dueDate: row.due_date || '',
    members: row.members || [],
    tasksCount: row.tasks_count || { total: 0, completed: 0 },
    budget: row.budget || '',
    theme: row.theme || null,
    isUserCreated: Boolean(row.is_user_created),
    createdAt: row.created_at
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = await getPool();
  const { id, workspace } = req.query || {};

  // =========================================================
  // GET /api/projects — Ambil semua proyek
  // =========================================================
  if (req.method === 'GET' && !id) {
    if (pool) {
      try {
        let query = 'SELECT * FROM projects';
        const params = [];
        if (workspace && workspace !== 'all') {
          query += ' WHERE workspace = $1';
          params.push(workspace);
        }
        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        const projects = result.rows.map(formatProject);
        if (!workspace || workspace === 'all') inMemoryProjects = projects;
        return res.status(200).json({ success: true, count: projects.length, data: projects });
      } catch (err) {
        console.warn('[api/projects] DB error on GET:', err.message);
      }
    }
    let filtered = [...inMemoryProjects];
    if (workspace && workspace !== 'all') {
      filtered = filtered.filter(p => (p.workspace || '').toLowerCase() === workspace.toLowerCase());
    }
    return res.status(200).json({ success: true, count: filtered.length, data: filtered, storage: 'inMemory' });
  }

  // =========================================================
  // GET /api/projects?id=xxx — Ambil satu proyek
  // =========================================================
  if (req.method === 'GET' && id) {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (result.rows.length > 0) {
          return res.status(200).json({ success: true, data: formatProject(result.rows[0]) });
        }
      } catch (err) {
        console.warn('[api/projects] DB error on GET by id:', err.message);
      }
    }
    const found = inMemoryProjects.find(p => String(p.id) === String(id));
    if (!found) return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
    return res.status(200).json({ success: true, data: found });
  }

  // =========================================================
  // POST /api/projects — Buat proyek baru
  // =========================================================
  if (req.method === 'POST') {
    const p = req.body || {};
    const newId = p.id || `proj-${Date.now()}`;
    const code = p.code || `#PRJ-${Math.floor(100 + Math.random() * 900)}`;
    const name = p.name || 'Proyek Baru';
    const description = p.description || '';
    const wsVal = p.workspace || 'panen-kunci';
    const status = p.status || 'active';
    const type = p.type || 'existing';
    const progress = Number(p.progress) || 0;
    const priority = p.priority || 'Medium';
    const startDate = p.startDate || p.start_date || '';
    const dueDate = p.dueDate || p.due_date || '';
    const members = p.members || [];
    const tasksCount = p.tasksCount || p.tasks_count || { total: 0, completed: 0 };
    const budget = p.budget || '';
    const theme = p.theme || null;
    const isUserCreated = p.isUserCreated !== undefined ? Boolean(p.isUserCreated) : true;

    const projectData = {
      id: newId, code, name, description, workspace: wsVal, status, type,
      progress, priority, startDate, dueDate, members, tasksCount,
      budget, theme, isUserCreated
    };

    const existingIdx = inMemoryProjects.findIndex(proj => proj.id === newId);
    if (existingIdx !== -1) {
      inMemoryProjects[existingIdx] = { ...inMemoryProjects[existingIdx], ...projectData };
    } else {
      inMemoryProjects.unshift(projectData);
    }

    if (pool) {
      try {
        const query = `
          INSERT INTO projects (
            id, code, name, description, workspace, status, type,
            progress, priority, start_date, due_date, members,
            tasks_count, budget, theme, is_user_created
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12::jsonb,
            $13::jsonb, $14, $15::jsonb, $16
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            workspace = EXCLUDED.workspace,
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            priority = EXCLUDED.priority,
            due_date = EXCLUDED.due_date,
            theme = EXCLUDED.theme,
            updated_at = NOW()
          RETURNING *
        `;
        const values = [
          newId, code, name, description, wsVal, status, type,
          progress, priority, startDate, dueDate, JSON.stringify(members),
          JSON.stringify(tasksCount), budget, JSON.stringify(theme), isUserCreated
        ];
        const result = await pool.query(query, values);
        return res.status(201).json({ success: true, data: formatProject(result.rows[0]) });
      } catch (err) {
        console.warn('[api/projects] DB error on POST:', err.message);
      }
    }

    return res.status(201).json({ success: true, data: projectData, storage: 'inMemory' });
  }

  // =========================================================
  // PUT /api/projects?id=xxx — Update proyek
  // =========================================================
  if (req.method === 'PUT' && id) {
    const updates = req.body || {};
    const idx = inMemoryProjects.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) inMemoryProjects[idx] = { ...inMemoryProjects[idx], ...updates };

    if (pool) {
      try {
        const query = `
          UPDATE projects SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            progress = COALESCE($4, progress),
            priority = COALESCE($5, priority),
            due_date = COALESCE($6, due_date),
            theme = COALESCE($7::jsonb, theme),
            updated_at = NOW()
          WHERE id = $8
          RETURNING *
        `;
        const values = [
          updates.name || null, updates.description || null,
          updates.status || null, updates.progress !== undefined ? Number(updates.progress) : null,
          updates.priority || null, updates.dueDate || updates.due_date || null,
          updates.theme ? JSON.stringify(updates.theme) : null,
          id
        ];
        const result = await pool.query(query, values);
        if (result.rows.length > 0) {
          return res.status(200).json({ success: true, data: formatProject(result.rows[0]) });
        }
      } catch (err) {
        console.warn('[api/projects] DB error on PUT:', err.message);
      }
    }

    const updated = inMemoryProjects.find(p => String(p.id) === String(id));
    return res.status(200).json({ success: true, data: updated || { id, ...updates }, storage: 'inMemory' });
  }

  // =========================================================
  // DELETE /api/projects?id=xxx — Hapus proyek
  // =========================================================
  if (req.method === 'DELETE') {
    if (id) inMemoryProjects = inMemoryProjects.filter(p => String(p.id) !== String(id));

    if (pool && id) {
      try {
        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        return res.status(200).json({ success: true, message: 'Proyek berhasil dihapus', id });
      } catch (err) {
        console.warn('[api/projects] DB error on DELETE:', err.message);
      }
    } else if (pool && !id) {
      // DELETE semua (bila diperlukan)
      try {
        await pool.query('DELETE FROM projects WHERE is_user_created = true');
      } catch (err) {}
    }

    return res.status(200).json({ success: true, message: 'Proyek dihapus', id, storage: 'inMemory' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
