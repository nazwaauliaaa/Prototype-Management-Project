import { Router } from 'express';
import { pool } from '../db.js';
import { fileStore } from '../fileStore.js';

const router = Router();

// Flag migrasi tabel users PostgreSQL
let isMigrationChecked = false;

async function ensureUserColumns() {
  if (isMigrationChecked) return;
  try {
    const alterQueries = [
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(100)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nip VARCHAR(50)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position VARCHAR(150)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school VARCHAR(150)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_project_id VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_workspace VARCHAR(100)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_workspace VARCHAR(100)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_board_name VARCHAR(150)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_task_id VARCHAR(100)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_task_title VARCHAR(255)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device VARCHAR(255)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_device_bound BOOLEAN DEFAULT false',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat VARCHAR(100)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(100)',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_deposit VARCHAR(100)'
    ];

    for (const q of alterQueries) {
      await pool.query(q).catch(() => {});
    }
    isMigrationChecked = true;
  } catch (err) {
    // Database mungkin offline atau tanpa permissions DDL
  }
}

// Format row PostgreSQL ke objek Managed User
function formatUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username || (row.email ? `@${row.email.split('@')[0]}` : `@${row.name?.toLowerCase().replace(/\s+/g, '')}`),
    fullName: row.full_name || row.name,
    role: row.role || 'student',
    nip: row.nip || '',
    position: row.position || row.title || 'Anggota Tim',
    school: row.school || '',
    assignedProjectId: row.assigned_project_id || (row.workspace_access && row.workspace_access[0]) || 'creativoffice',
    assignedWorkspace: row.assigned_workspace || (row.workspace_access && row.workspace_access[0]) || 'creativoffice',
    assignedBoardName: row.assigned_board_name || 'CreativOffice',
    assignedTaskId: row.assigned_task_id || 'all',
    assignedTaskTitle: row.assigned_task_title || 'Seluruh Papan (Semua Tugas)',
    device: row.bound_device_name || row.device || (row.bound_device_id ? 'Terikat' : 'Belum Terikat'),
    isDeviceBound: Boolean(row.bound_device_id || row.is_device_bound),
    telegramChat: row.telegram_chat || '',
    telegramId: row.telegram_id || '',
    apiDeposit: row.api_deposit || '',
    qr_data: row.qr_data || row.username || row.name,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

// GET /api/users/managed - Ambil semua pengguna terkelola untuk admin & scanner
router.get('/managed', async (req, res) => {
  try {
    await ensureUserColumns();
    const result = await pool.query('SELECT * FROM public.users ORDER BY created_at ASC');
    if (result && Array.isArray(result.rows)) {
      const users = result.rows.map(formatUserRow);
      return res.json({ success: true, count: users.length, data: users, source: 'postgres' });
    }
  } catch (err) {
    // Fallback ke fileStore jika database offline
  }

  const fileUsers = fileStore.getManagedUsers();
  return res.json({ success: true, count: fileUsers.length, data: fileUsers, source: 'fileStore' });
});

// POST /api/users/managed - Simpan atau perbarui daftar anggota (batch atau single) ke Supabase & fileStore
router.post('/managed', async (req, res) => {
  const body = req.body;
  const usersToSave = Array.isArray(body) ? body : (body?.users || (body?.id || body?.username ? [body] : null));

  if (!usersToSave || usersToSave.length === 0) {
    return res.status(400).json({ success: false, error: 'Format data pengguna tidak valid' });
  }

  // 1. Simpan selalu ke fileStore lokal
  fileStore.saveManagedUsers(usersToSave);

  // 2. Jika PostgreSQL / Supabase aktif, sinkronkan ke tabel public.users
  try {
    await ensureUserColumns();
    for (const u of usersToSave) {
      const id = u.id || `usr-${Date.now()}`;
      const fullName = u.fullName || u.name || 'User';
      const username = u.username || `@${fullName.toLowerCase().replace(/\s+/g, '')}`;
      const role = u.role || 'student';
      const email = u.email || `${username.replace(/^@/, '')}@sampulkreativ.id`;
      const projId = u.assignedProjectId || 'creativoffice';
      const workspace = u.assignedWorkspace || projId;
      const boardName = u.assignedBoardName || 'CreativOffice';
      const taskId = u.assignedTaskId || 'all';
      const taskTitle = u.assignedTaskTitle || 'Seluruh Papan (Semua Tugas)';
      const device = u.device || 'Belum Terikat';
      const isDeviceBound = Boolean(u.isDeviceBound);
      const telegramChat = u.telegramChat || '';
      const telegramId = u.telegramId || '';
      const apiDeposit = u.apiDeposit || '';
      const qrData = u.qr_data || username;
      const nip = u.nip || '';
      const position = u.position || 'Siswa PKL';
      const school = u.school || '';

      const query = `
        INSERT INTO public.users (
          id, name, full_name, username, role, title, jobdesk, email,
          nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name,
          assigned_task_id, assigned_task_title, device, is_device_bound, telegram_chat, telegram_id, api_deposit,
          qr_data, workspace_access, updated_at
        ) VALUES (
          $1, $2, $2, $3, $4, $5, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19,
          $20, $21::jsonb, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          full_name = EXCLUDED.full_name,
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          title = EXCLUDED.title,
          jobdesk = EXCLUDED.jobdesk,
          email = EXCLUDED.email,
          nip = EXCLUDED.nip,
          position = EXCLUDED.position,
          school = EXCLUDED.school,
          assigned_project_id = EXCLUDED.assigned_project_id,
          assigned_workspace = EXCLUDED.assigned_workspace,
          assigned_board_name = EXCLUDED.assigned_board_name,
          assigned_task_id = EXCLUDED.assigned_task_id,
          assigned_task_title = EXCLUDED.assigned_task_title,
          device = EXCLUDED.device,
          is_device_bound = EXCLUDED.is_device_bound,
          telegram_chat = EXCLUDED.telegram_chat,
          telegram_id = EXCLUDED.telegram_id,
          api_deposit = EXCLUDED.api_deposit,
          qr_data = EXCLUDED.qr_data,
          workspace_access = EXCLUDED.workspace_access,
          updated_at = NOW()
      `;

      await pool.query(query, [
        id, fullName, username, role, position, email,
        nip, position, school, projId, workspace, boardName,
        taskId, taskTitle, device, isDeviceBound, telegramChat, telegramId, apiDeposit,
        qrData, JSON.stringify([workspace])
      ]).catch(err => {
        console.warn(`[server/users] Gagal simpan ${username} ke Supabase:`, err.message);
      });
      console.log(`[server/users] ✅ Berhasil menyimpan user ke Supabase: ${fullName} (${username})`);
    }
  } catch (err) {
    console.warn('[server/routes/users] Sync Postgres warning:', err.message);
  }

  return res.json({ success: true, count: usersToSave.length, data: usersToSave });
});

// DELETE /api/users/managed/all - Kosongkan seluruh pengguna
router.delete('/managed/all', async (req, res) => {
  fileStore.clearAllManagedUsers();
  try {
    await pool.query('DELETE FROM public.users');
    console.log('[server/users] ✅ Seluruh tabel users di Supabase berhasil dikosongkan');
  } catch (err) {
    console.warn('[server/users] Gagal kosongkan Supabase users:', err.message);
  }
  return res.json({ success: true, message: 'Seluruh pengguna berhasil dihapus' });
});

// DELETE /api/users/managed/:id - Hapus anggota dari sistem dan Supabase
router.delete('/managed/:id', async (req, res) => {
  const { id } = req.params;
  
  if (id === 'all' || id === 'clear') {
    fileStore.clearAllManagedUsers();
    try {
      await pool.query('DELETE FROM public.users');
    } catch (err) {}
    return res.json({ success: true, message: 'Seluruh pengguna berhasil dihapus' });
  }

  // Hapus dari fileStore
  fileStore.deleteManagedUser(id);

  // Hapus dari PostgreSQL / Supabase jika aktif
  try {
    await pool.query('DELETE FROM public.users WHERE id = $1', [id]);
    console.log(`[server/users] ✅ Berhasil menghapus user dari Supabase: ${id}`);
  } catch (err) {
    console.warn('[server/users] Gagal hapus user dari Supabase:', err.message);
  }

  return res.json({ success: true, message: 'Pengguna berhasil dihapus', id });
});

// POST /api/users - Alias untuk simpan managed users
router.post('/', async (req, res, next) => {
  req.url = '/managed';
  router.handle(req, res, next);
});

// DELETE /api/users - Alias untuk hapus managed user dengan query param ?id=...
router.delete('/', async (req, res) => {
  const id = req.query.id || req.body?.id;
  if (!id) return res.status(400).json({ success: false, error: 'User ID diperlukan' });
  
  if (id === 'all' || id === 'clear') {
    fileStore.clearAllManagedUsers();
    try {
      await pool.query('DELETE FROM public.users');
    } catch (err) {}
    return res.json({ success: true, message: 'Seluruh pengguna berhasil dihapus' });
  }

  fileStore.deleteManagedUser(id);
  try {
    await pool.query('DELETE FROM public.users WHERE id = $1', [id]);
    console.log(`[server/users] ✅ Berhasil menghapus user dari Supabase: ${id}`);
  } catch (err) {
    console.warn('[server/users] Gagal hapus user dari Supabase:', err.message);
  }

  return res.json({ success: true, message: 'Pengguna berhasil dihapus', id });
});

// GET /api/users - Alias untuk managed users
router.get('/', (req, res) => {
  res.redirect('/api/users/managed');
});

export default router;
