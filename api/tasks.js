import { createRequire } from 'module';

let inMemoryTasks = [];
try {
  const req = createRequire(import.meta.url);
  const defaultTasks = req('../server/data/tasks.json');
  if (Array.isArray(defaultTasks) && defaultTasks.length > 0) {
    inMemoryTasks = [...defaultTasks];
  }
} catch (e) {
  console.warn('[api/tasks] Could not load default tasks from json:', e.message);
}

let pgPool = null;
async function getPgPool() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_URL;
  if (!connStr) return null;
  if (!pgPool) {
    try {
      const { default: pg } = await import('pg');
      pgPool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
      });
    } catch (e) {
      console.warn('[api/tasks] pg module tidak dapat dimuat di serverless environment:', e.message);
    }
  }
  return pgPool;
}

function formatTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description || '',
    workspace: row.workspace || 'panen-kunci',
    board: row.board || 'backend-core',
    status: row.status || 'in-progress',
    priority: row.priority || 'Medium',
    pic: row.pic || { name: 'Kevin Santoso', avatar: '', initials: 'KS' },
    timeline: row.timeline || '',
    hours: parseFloat(row.hours) || 0,
    assets: row.assets || [],
    qaProgress: row.qa_progress || { passed: 0, total: 4 },
    isStarred: Boolean(row.is_starred),
    tags: row.tags || [],
    location: row.location || '',
    resolution: row.resolution || '',
    projectId: row.project_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = await getPgPool();

  try {
    const { workspace, projectId } = req.query || {};

    // ── 1. GET /api/tasks ──
    if (req.method === 'GET') {
      if (pool) {
        try {
          let query = 'SELECT * FROM tasks WHERE 1=1';
          const params = [];
          if (workspace && workspace !== 'all') {
            params.push(workspace);
            query += ` AND workspace = $${params.length}`;
          }
          if (projectId) {
            params.push(projectId);
            query += ` AND project_id = $${params.length}`;
          }
          query += ' ORDER BY created_at DESC';
          const dbRes = await pool.query(query, params);
          if (dbRes.rows && dbRes.rows.length > 0) {
            const formatted = dbRes.rows.map(formatTaskRow);
            inMemoryTasks = formatted;
            return res.status(200).json({ success: true, count: formatted.length, data: formatted });
          }
        } catch (dbErr) {
          console.warn('[api/tasks] DB Query error, fallback to inMemory:', dbErr.message);
        }
      }

      let filtered = [...inMemoryTasks];
      if (workspace && workspace !== 'all') {
        const wsLower = workspace.toLowerCase();
        filtered = filtered.filter(t => (t.workspace || '').toLowerCase() === wsLower);
      }
      if (projectId) {
        const pLower = projectId.toLowerCase();
        filtered = filtered.filter(t => (t.projectId || '').toLowerCase() === pLower);
      }
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }

    // ── 2. POST /api/tasks ──
    if (req.method === 'POST') {
      const task = req.body || {};
      const id = task.id || `task-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const newTask = {
        ...task,
        id,
        updatedAt: Date.now()
      };

      if (pool) {
        try {
          const insertQuery = `
            INSERT INTO tasks (
              id, code, title, description, workspace, board, status, priority,
              pic, timeline, hours, assets, qa_progress, is_starred, tags,
              location, resolution, project_id, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, NOW(), NOW()
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
            id,
            task.code || '#TASK',
            task.title || 'Untitled Task',
            task.description || '',
            task.workspace || 'creativoffice',
            task.board || 'creativoffice',
            task.status || 'in-progress',
            task.priority || 'Medium',
            JSON.stringify(task.pic || { name: 'Kevin Santoso', initials: 'KS' }),
            task.timeline || '',
            Number(task.hours) || 0,
            JSON.stringify(task.assets || []),
            JSON.stringify(task.qaProgress || task.qa_progress || { passed: 0, total: 4 }),
            Boolean(task.isStarred),
            JSON.stringify(task.tags || []),
            task.location || '',
            task.resolution || '',
            task.projectId || null
          ];
          const result = await pool.query(insertQuery, values);
          if (result.rows[0]) {
            const created = formatTaskRow(result.rows[0]);
            inMemoryTasks = inMemoryTasks.filter(t => String(t.id) !== String(id));
            inMemoryTasks.unshift(created);
            return res.status(201).json({ success: true, data: created });
          }
        } catch (dbErr) {
          console.warn('[api/tasks] DB Insert error, fallback to memory:', dbErr.message);
        }
      }

      inMemoryTasks = inMemoryTasks.filter(t => String(t.id) !== String(id));
      inMemoryTasks.unshift(newTask);
      return res.status(201).json({ success: true, data: newTask });
    }

    // ── 3. PUT /api/tasks ──
    if (req.method === 'PUT') {
      const urlId = req.url ? req.url.split('?')[0].split('/').filter(Boolean).pop() : null;
      const id = req.query?.id || (urlId !== 'tasks' ? urlId : null) || req.body?.id;
      const updates = req.body || {};

      if (pool && id) {
        try {
          const updateQuery = `
            UPDATE tasks SET
              title = COALESCE($1, title),
              status = COALESCE($2, status),
              priority = COALESCE($3, priority),
              updated_at = NOW()
            WHERE id = $4 OR code = $4
            RETURNING *
          `;
          const resUp = await pool.query(updateQuery, [updates.title, updates.status, updates.priority, id]);
          if (resUp.rows[0]) {
            const updated = formatTaskRow(resUp.rows[0]);
            return res.status(200).json({ success: true, data: updated });
          }
        } catch (dbErr) {
          console.warn('[api/tasks] DB Update error:', dbErr.message);
        }
      }

      const idx = inMemoryTasks.findIndex(t => String(t.id) === String(id) || String(t.code) === String(id));
      if (idx !== -1) {
        inMemoryTasks[idx] = { ...inMemoryTasks[idx], ...updates, updatedAt: Date.now() };
        return res.status(200).json({ success: true, data: inMemoryTasks[idx] });
      }
      return res.status(404).json({ success: false, error: 'Task tidak ditemukan' });
    }

    // ── 4. DELETE /api/tasks ──
    if (req.method === 'DELETE') {
      const urlId = req.url ? req.url.split('?')[0].split('/').filter(Boolean).pop() : null;
      const id = req.query?.id || (urlId !== 'tasks' ? urlId : null) || req.body?.id;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Task ID diperlukan' });
      }

      if (pool) {
        try {
          await pool.query('DELETE FROM tasks WHERE id = $1 OR code = $1', [id]);
        } catch (dbErr) {
          console.warn('[api/tasks] DB Delete error:', dbErr.message);
        }
      }

      inMemoryTasks = inMemoryTasks.filter(t => String(t.id) !== String(id) && String(t.code) !== String(id));
      return res.status(200).json({ success: true, message: 'Task berhasil dihapus', id });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
