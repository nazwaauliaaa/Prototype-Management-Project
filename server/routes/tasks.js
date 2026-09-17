import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Helper konversi row PostgreSQL ke model Task
function formatTask(row) {
  if (!row) return null;
  return {
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
    resolution: row.resolution || '',
    projectId: row.project_id || null,
    createdAt: row.created_at
  };
}

// GET /api/tasks - Ambil semua tugas (bisa difilter workspace / projectId)
router.get('/', async (req, res) => {
  try {
    const { workspace, projectId } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (workspace) {
      params.push(workspace);
      query += ` AND workspace = $${params.length}`;
    }

    if (projectId) {
      params.push(projectId);
      query += ` AND project_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const tasks = result.rows.map(formatTask);
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    console.error('Error GET /api/tasks:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/:id - Ambil satu tugas
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tugas tidak ditemukan' });
    }
    res.json({ success: true, data: formatTask(result.rows[0]) });
  } catch (err) {
    console.error('Error GET /api/tasks/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper parsing JSON aman
function safeJsonString(val, defaultVal) {
  if (val === undefined || val === null) return JSON.stringify(defaultVal);
  if (typeof val === 'string') {
    try {
      JSON.parse(val);
      return val;
    } catch (e) {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
}

// POST /api/tasks - Buat tugas baru
router.post('/', async (req, res) => {
  try {
    const t = req.body;
    const id = t.id || 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const code = t.code || `#RK-${Math.floor(100 + Math.random() * 900)}`;
    const title = t.title || 'Tugas Baru';
    const description = t.description || '';
    const workspace = t.workspace || 'ruangkreasi';
    const board = t.board || 'kampanye-q3';
    const status = t.status || 'in-progress';
    const priority = t.priority || 'Medium';
    const pic = safeJsonString(t.pic, { name: 'Sari Rahmawati', avatar: '', initials: 'SR' });
    const timeline = t.timeline || '';
    const hours = Number(t.hours) || 0;
    const assets = safeJsonString(t.assets || t.attachments, []);
    const qaProgress = safeJsonString(t.qaProgress || t.qa_progress, { passed: 0, total: 4 });
    const isStarred = Boolean(t.isStarred || t.is_starred);
    const tags = safeJsonString(t.tags, []);
    const location = t.location || '';
    const resolution = t.resolution || '';

    // Validasi project_id agar tidak melanggar foreign key constraint tasks_project_id_fkey
    let validProjectId = null;
    const rawProjectId = t.projectId || t.project_id;
    if (rawProjectId) {
      try {
        const projCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [rawProjectId]);
        if (projCheck.rows.length > 0) {
          validProjectId = projCheck.rows[0].id;
        } else {
          const wsCheck = await pool.query('SELECT id FROM projects WHERE workspace = $1', [rawProjectId]);
          if (wsCheck.rows.length > 0) {
            validProjectId = wsCheck.rows[0].id;
          }
        }
      } catch (checkErr) {
        console.warn('Gagal validasi project_id:', checkErr.message);
      }
    }

    const query = `
      INSERT INTO tasks (
        id, code, title, description, workspace, board, status,
        priority, pic, timeline, hours, assets, qa_progress,
        is_starred, tags, location, resolution, project_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb,
        $14, $15::jsonb, $16, $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        workspace = EXCLUDED.workspace,
        board = EXCLUDED.board,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        pic = EXCLUDED.pic,
        timeline = EXCLUDED.timeline,
        hours = EXCLUDED.hours,
        assets = EXCLUDED.assets,
        qa_progress = EXCLUDED.qa_progress,
        is_starred = EXCLUDED.is_starred,
        tags = EXCLUDED.tags,
        location = EXCLUDED.location,
        resolution = EXCLUDED.resolution,
        project_id = EXCLUDED.project_id,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      id, code, title, description, workspace, board, status,
      priority, pic, timeline, hours, assets, qaProgress,
      isStarred, tags, location, resolution, validProjectId
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: formatTask(result.rows[0]) });
  } catch (err) {
    console.error('Error POST /api/tasks:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/tasks/:id - Update tugas
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t = req.body;

    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tugas tidak ditemukan' });
    }

    const current = existing.rows[0];

    const title = t.title !== undefined ? t.title : current.title;
    const description = t.description !== undefined ? t.description : current.description;
    const board = t.board !== undefined ? t.board : current.board;
    const status = t.status !== undefined ? t.status : current.status;
    const priority = t.priority !== undefined ? t.priority : current.priority;
    const pic = t.pic !== undefined ? safeJsonString(t.pic, current.pic) : safeJsonString(current.pic, {});
    const timeline = t.timeline !== undefined ? t.timeline : current.timeline;
    const hours = t.hours !== undefined ? Number(t.hours) : current.hours;
    const assets = t.assets !== undefined || t.attachments !== undefined
      ? safeJsonString(t.assets || t.attachments, current.assets)
      : safeJsonString(current.assets, []);
    const qaProgress = t.qaProgress !== undefined || t.qa_progress !== undefined
      ? safeJsonString(t.qaProgress || t.qa_progress, current.qa_progress)
      : safeJsonString(current.qa_progress, {});
    const isStarred = t.isStarred !== undefined ? Boolean(t.isStarred) : current.is_starred;
    const tags = t.tags !== undefined ? safeJsonString(t.tags, current.tags) : safeJsonString(current.tags, []);
    const location = t.location !== undefined ? t.location : current.location;
    const resolution = t.resolution !== undefined ? t.resolution : current.resolution;

    let validProjectId = current.project_id;
    if (t.projectId !== undefined || t.project_id !== undefined) {
      const candidate = t.projectId !== undefined ? t.projectId : t.project_id;
      if (candidate) {
        try {
          const projCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [candidate]);
          if (projCheck.rows.length > 0) {
            validProjectId = projCheck.rows[0].id;
          } else {
            const wsCheck = await pool.query('SELECT id FROM projects WHERE workspace = $1', [candidate]);
            validProjectId = wsCheck.rows.length > 0 ? wsCheck.rows[0].id : null;
          }
        } catch (e) {
          validProjectId = null;
        }
      } else {
        validProjectId = null;
      }
    }

    const query = `
      UPDATE tasks SET
        title = $1, description = $2, board = $3, status = $4,
        priority = $5, pic = $6::jsonb, timeline = $7, hours = $8,
        assets = $9::jsonb, qa_progress = $10::jsonb, is_starred = $11,
        tags = $12::jsonb, location = $13, resolution = $14,
        project_id = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      title, description, board, status,
      priority, pic, timeline, hours,
      assets, qaProgress, isStarred,
      tags, location, resolution, validProjectId, id
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: formatTask(result.rows[0]) });
  } catch (err) {
    console.error('Error PUT /api/tasks/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id - Hapus tugas
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tugas tidak ditemukan' });
    }
    res.json({ success: true, message: 'Tugas berhasil dihapus', id });
  } catch (err) {
    console.error('Error DELETE /api/tasks/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
