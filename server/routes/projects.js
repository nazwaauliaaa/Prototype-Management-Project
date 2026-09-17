import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Helper konversi row PostgreSQL ke format model Project frontend
function formatProject(row) {
  if (!row) return null;
  return {
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
    members: row.members || [],
    tasksCount: row.tasks_count || { total: 0, completed: 0 },
    budget: row.budget || '',
    theme: row.theme || null,
    isUserCreated: Boolean(row.is_user_created),
    createdAt: row.created_at
  };
}

// GET /api/projects - Ambil semua proyek
router.get('/', async (req, res) => {
  try {
    const { workspace } = req.query;
    let query = 'SELECT * FROM projects';
    const params = [];

    if (workspace) {
      query += ' WHERE workspace = $1';
      params.push(workspace);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const projects = result.rows.map(formatProject);
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    console.error('Error GET /api/projects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:id - Ambil satu proyek
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
    }
    res.json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    console.error('Error GET /api/projects/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects - Tambah proyek baru
router.post('/', async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || 'proj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const code = p.code || `PRJ-${Math.floor(100 + Math.random() * 900)}`;
    const name = p.name || 'Proyek Tanpa Nama';
    const description = p.description || '';
    const workspace = p.workspace || 'ruangkreasi';
    const status = p.status || 'active';
    const type = p.type || 'existing';
    const progress = Number(p.progress) || 0;
    const priority = p.priority || 'Medium';
    const startDate = p.startDate || '';
    const dueDate = p.dueDate || '';
    const members = JSON.stringify(p.members || []);
    const tasksCount = JSON.stringify(p.tasksCount || { total: 0, completed: 0 });
    const budget = p.budget || '';
    const theme = p.theme ? JSON.stringify(p.theme) : null;
    const isUserCreated = p.isUserCreated !== undefined ? p.isUserCreated : true;

    const query = `
      INSERT INTO projects (
        id, code, name, description, workspace, status, type,
        progress, priority, start_date, due_date, members,
        tasks_count, budget, theme, is_user_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15::jsonb, $16)
      RETURNING *
    `;

    const values = [
      id, code, name, description, workspace, status, type,
      progress, priority, startDate, dueDate, members,
      tasksCount, budget, theme, isUserCreated
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    console.error('Error POST /api/projects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/projects/:id - Perbarui data proyek
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;

    // Ambil data lama terlebih dahulu
    const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
    }

    const current = existing.rows[0];

    const name = p.name !== undefined ? p.name : current.name;
    const description = p.description !== undefined ? p.description : current.description;
    const status = p.status !== undefined ? p.status : current.status;
    const type = p.type !== undefined ? p.type : current.type;
    const progress = p.progress !== undefined ? Number(p.progress) : current.progress;
    const priority = p.priority !== undefined ? p.priority : current.priority;
    const startDate = p.startDate !== undefined ? p.startDate : current.start_date;
    const dueDate = p.dueDate !== undefined ? p.dueDate : current.due_date;
    const members = p.members !== undefined ? JSON.stringify(p.members) : JSON.stringify(current.members);
    const tasksCount = p.tasksCount !== undefined ? JSON.stringify(p.tasksCount) : JSON.stringify(current.tasks_count);
    const budget = p.budget !== undefined ? p.budget : current.budget;
    const theme = p.theme !== undefined ? JSON.stringify(p.theme) : JSON.stringify(current.theme);

    const query = `
      UPDATE projects SET
        name = $1, description = $2, status = $3, type = $4,
        progress = $5, priority = $6, start_date = $7, due_date = $8,
        members = $9::jsonb, tasks_count = $10::jsonb, budget = $11,
        theme = $12::jsonb, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    const values = [
      name, description, status, type,
      progress, priority, startDate, dueDate,
      members, tasksCount, budget, theme, id
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    console.error('Error PUT /api/projects/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/projects/:id - Dukung juga metode PATCH
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;

    const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
    }

    const current = existing.rows[0];

    const name = p.name !== undefined ? p.name : current.name;
    const description = p.description !== undefined ? p.description : current.description;
    const status = p.status !== undefined ? p.status : current.status;
    const type = p.type !== undefined ? p.type : current.type;
    const progress = p.progress !== undefined ? Number(p.progress) : current.progress;
    const priority = p.priority !== undefined ? p.priority : current.priority;
    const startDate = p.startDate !== undefined ? p.startDate : current.start_date;
    const dueDate = p.dueDate !== undefined ? p.dueDate : current.due_date;
    const members = p.members !== undefined ? JSON.stringify(p.members) : JSON.stringify(current.members);
    const tasksCount = p.tasksCount !== undefined ? JSON.stringify(p.tasksCount) : JSON.stringify(current.tasks_count);
    const budget = p.budget !== undefined ? p.budget : current.budget;
    const theme = p.theme !== undefined ? JSON.stringify(p.theme) : JSON.stringify(current.theme);

    const query = `
      UPDATE projects SET
        name = $1, description = $2, status = $3, type = $4,
        progress = $5, priority = $6, start_date = $7, due_date = $8,
        members = $9::jsonb, tasks_count = $10::jsonb, budget = $11,
        theme = $12::jsonb, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    const values = [
      name, description, status, type,
      progress, priority, startDate, dueDate,
      members, tasksCount, budget, theme, id
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    console.error('Error PATCH /api/projects/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id - Hapus satu proyek
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
    }
    res.json({ success: true, message: 'Proyek berhasil dihapus', id });
  } catch (err) {
    console.error('Error DELETE /api/projects/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects - Hapus semua proyek (reset)
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM projects');
    res.json({ success: true, message: 'Semua proyek telah dihapus' });
  } catch (err) {
    console.error('Error DELETE /api/projects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
