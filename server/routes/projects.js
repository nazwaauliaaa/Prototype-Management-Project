import { Router } from 'express';
import { pool } from '../db.js';
import { fileStore } from '../fileStore.js';

const router = Router();

// Helper konversi row PostgreSQL ke format model Project frontend
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
  const { workspace } = req.query;
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
    return res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    const projects = fileStore.getProjects(workspace);
    return res.json({ success: true, count: projects.length, data: projects, storage: 'fileStore' });
  }
});

// GET /api/projects/:id - Ambil satu proyek
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      const projects = fileStore.getProjects();
      const p = projects.find(item => String(item.id) === String(id));
      if (!p) return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
      return res.json({ success: true, data: p });
    }
    return res.json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    const projects = fileStore.getProjects();
    const p = projects.find(item => String(item.id) === String(id));
    if (!p) return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan' });
    return res.json({ success: true, data: p });
  }
});

// POST /api/projects - Buat proyek baru
router.post('/', async (req, res) => {
  const p = req.body;
  const id = p.id || 'proj-' + Date.now();
  const code = p.code || `#PRJ-${Math.floor(100 + Math.random() * 900)}`;
  const name = p.name || 'Proyek Baru';
  const description = p.description || '';
  const workspace = p.workspace || 'panen-kunci';
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

  const savedToFile = fileStore.saveProject({
    id, code, name, description, workspace, status, type,
    progress, priority, startDate, dueDate, members,
    tasksCount, budget, theme, isUserCreated
  });

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
        members = EXCLUDED.members,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      id, code, name, description, workspace, status, type,
      progress, priority, startDate, dueDate, JSON.stringify(members),
      JSON.stringify(tasksCount), budget, JSON.stringify(theme), isUserCreated
    ];

    const result = await pool.query(query, values);
    return res.status(201).json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    return res.status(201).json({ success: true, data: savedToFile, storage: 'fileStore' });
  }
});

// PUT /api/projects/:id - Update proyek
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  const updatedInFile = fileStore.updateProject(id, p);

  try {
    const query = `
      UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        progress = COALESCE($4, progress),
        priority = COALESCE($5, priority),
        due_date = COALESCE($6, due_date),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    const values = [p.name, p.description, p.status, p.progress, p.priority, p.dueDate, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.json({ success: true, data: updatedInFile });
    }
    return res.json({ success: true, data: formatProject(result.rows[0]) });
  } catch (err) {
    return res.json({ success: true, data: updatedInFile, storage: 'fileStore' });
  }
});

// DELETE /api/projects/:id - Hapus proyek
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  fileStore.deleteProject(id);

  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Proyek berhasil dihapus', id });
  } catch (err) {
    return res.json({ success: true, message: 'Proyek berhasil dihapus', id, storage: 'fileStore' });
  }
});

export default router;
