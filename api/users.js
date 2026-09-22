// Vercel Serverless Function untuk /api/users dan /api/users/managed

const DEFAULT_USERS = [
  {
    id: 'usr-1790046404637',
    username: '@nazwaaulial',
    fullName: 'Nazwa Aulia Latifah',
    role: 'student',
    nip: '2026',
    position: 'Siswa PKL',
    school: '',
    assignedProjectId: 'creativoffice',
    assignedWorkspace: 'creativoffice',
    assignedBoardName: 'CreativOffice',
    assignedTaskId: 'all',
    assignedTaskTitle: 'Seluruh Papan (Semua Tugas)',
    device: 'Belum Terikat',
    isDeviceBound: false,
    qr_data: '@nazwaaulial',
    updatedAt: Date.now()
  },
  {
    id: 'usr-1790046919250',
    username: '@jax_ck',
    fullName: 'Fakhrul Miandi Rachman',
    role: 'student',
    nip: '2026',
    position: 'Siswa PKL',
    school: '',
    assignedProjectId: 'panen-kunci',
    assignedWorkspace: 'panen-kunci',
    assignedBoardName: 'Panen Kunci (Utama)',
    assignedTaskId: 'all',
    assignedTaskTitle: 'Seluruh Papan (Semua Tugas)',
    device: 'Belum Terikat',
    isDeviceBound: false,
    qr_data: '@jax_ck',
    updatedAt: Date.now()
  },
  {
    id: 'usr-1790049070981',
    username: '@fazlies',
    fullName: 'Muhamad Fazli Esfandiar',
    role: 'student',
    nip: '2026',
    position: 'Siswa PKL',
    school: '',
    assignedProjectId: 'creativoffice',
    assignedWorkspace: 'creativoffice',
    assignedBoardName: 'CreativOffice (Creative Office)',
    assignedTaskId: 'all',
    assignedTaskTitle: 'Seluruh Papan (Semua Tugas)',
    device: 'Belum Terikat',
    isDeviceBound: false,
    qr_data: '@fazlies',
    updatedAt: Date.now()
  }
];

let inMemoryUsers = [...DEFAULT_USERS];

// Helper database PostgreSQL jika DATABASE_URL dikonfigurasi di Vercel
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
      console.warn('[api/users] pg module tidak dapat dimuat di serverless environment:', e.message);
    }
  }
  return pgPool;
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
    // ================= GET /api/users atau /api/users/managed =================
    if (req.method === 'GET') {
      if (pool) {
        try {
          const dbRes = await pool.query('SELECT * FROM public.users ORDER BY created_at ASC');
          if (dbRes.rows && dbRes.rows.length > 0) {
            const mapped = dbRes.rows.map(r => ({
              id: r.id,
              username: r.username || (r.email ? `@${r.email.split('@')[0]}` : `@${r.name?.toLowerCase().replace(/\s+/g, '')}`),
              fullName: r.full_name || r.name,
              role: r.role || 'student',
              nip: r.nip || '',
              position: r.position || r.title || 'Anggota Tim',
              school: r.school || '',
              assignedProjectId: r.assigned_project_id || (r.workspace_access && r.workspace_access[0]) || 'creativoffice',
              assignedWorkspace: r.assigned_workspace || (r.workspace_access && r.workspace_access[0]) || 'creativoffice',
              assignedBoardName: r.assigned_board_name || 'CreativOffice',
              assignedTaskId: r.assigned_task_id || 'all',
              assignedTaskTitle: r.assigned_task_title || 'Seluruh Papan (Semua Tugas)',
              device: r.bound_device_name || r.device || (r.bound_device_id ? 'Terikat' : 'Belum Terikat'),
              isDeviceBound: Boolean(r.bound_device_id || r.is_device_bound),
              telegramChat: r.telegram_chat || '',
              telegramId: r.telegram_id || '',
              apiDeposit: r.api_deposit || '',
              qr_data: r.qr_data || r.username || r.name,
              updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now()
            }));
            inMemoryUsers = mapped;
            return res.status(200).json({ success: true, count: mapped.length, data: mapped, source: 'postgres' });
          }
        } catch (dbErr) {
          console.warn('[api/users] Database query error on Vercel:', dbErr.message);
        }
      }

      return res.status(200).json({ success: true, count: inMemoryUsers.length, data: inMemoryUsers, source: 'inMemory' });
    }

    // ================= POST /api/users atau /api/users/managed =================
    if (req.method === 'POST') {
      const body = req.body;
      const usersToSave = Array.isArray(body) ? body : (body?.users || (body?.id || body?.username ? [body] : null));

      if (!usersToSave || usersToSave.length === 0) {
        return res.status(400).json({ success: false, error: 'Data user tidak valid' });
      }

      // Update inMemoryUsers
      for (const u of usersToSave) {
        const id = u.id || `usr-${Date.now()}`;
        const idx = inMemoryUsers.findIndex(item => String(item.id) === String(id) || (item.username && u.username && item.username.toLowerCase() === u.username.toLowerCase()));
        const userObj = { ...u, id, updatedAt: Date.now() };
        if (idx !== -1) {
          inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...userObj };
        } else {
          inMemoryUsers.unshift(userObj);
        }
      }

      // Sync ke database PostgreSQL / Supabase jika aktif
      if (pool) {
        try {
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
              console.warn(`[api/users] Gagal simpan ${username} ke Supabase:`, err.message);
            });
          }
        } catch (dbErr) {
          console.warn('[api/users] Error inserting to database:', dbErr.message);
        }
      }

      return res.status(200).json({ success: true, count: usersToSave.length, data: inMemoryUsers });
    }

    // ================= DELETE /api/users =================
    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (id) {
        inMemoryUsers = inMemoryUsers.filter(u => String(u.id) !== String(id));
        if (pool) {
          try {
            await pool.query('DELETE FROM public.users WHERE id = $1', [id]);
          } catch (e) {}
        }
        return res.status(200).json({ success: true, message: 'User berhasil dihapus', id });
      }
      return res.status(400).json({ success: false, error: 'ID user diperlukan' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
