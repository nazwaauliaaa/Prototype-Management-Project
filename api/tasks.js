// Vercel Serverless Function untuk /api/tasks
const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a0ae918ca32524';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const cloudRes = await fetch(CLOUD_SYNC_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const cloudJson = await cloudRes.json();
    let tasks = Array.isArray(cloudJson?.data?.tasks) ? cloudJson.data.tasks : [];

    const { workspace, projectId } = req.query || {};

    if (req.method === 'GET') {
      if (workspace && workspace !== 'all') {
        const wsLower = workspace.toLowerCase();
        tasks = tasks.filter(t => (t.workspace || '').toLowerCase() === wsLower);
      }
      if (projectId) {
        const pLower = projectId.toLowerCase();
        tasks = tasks.filter(t => (t.projectId || '').toLowerCase() === pLower);
      }
      return res.status(200).json({ success: true, count: tasks.length, data: tasks });
    }

    if (req.method === 'POST') {
      const newTask = { ...req.body, updatedAt: Date.now() };
      tasks.unshift(newTask);
      await fetch(CLOUD_SYNC_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'PrototypeTasks', data: { tasks, updatedAt: Date.now() } })
      });
      return res.status(201).json({ success: true, data: newTask });
    }

    if (req.method === 'PUT') {
      const { id } = req.query || {};
      const updates = req.body || {};
      const idx = tasks.findIndex(t => String(t.id) === String(id) || String(t.code) === String(id));
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...updates, updatedAt: Date.now() };
        await fetch(CLOUD_SYNC_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'PrototypeTasks', data: { tasks, updatedAt: Date.now() } })
        });
        return res.status(200).json({ success: true, data: tasks[idx] });
      }
      return res.status(404).json({ success: false, error: 'Task tidak ditemukan' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      tasks = tasks.filter(t => String(t.id) !== String(id) && String(t.code) !== String(id));
      await fetch(CLOUD_SYNC_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'PrototypeTasks', data: { tasks, updatedAt: Date.now() } })
      });
      return res.status(200).json({ success: true, message: 'Task berhasil dihapus', id });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
