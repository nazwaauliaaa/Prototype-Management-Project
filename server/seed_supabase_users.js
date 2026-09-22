import { pool } from './db.js';

const defaultUsers = [
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
    telegramChat: '',
    telegramId: '',
    apiDeposit: '',
    qr_data: '@nazwaaulial'
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
    telegramChat: '',
    telegramId: '',
    apiDeposit: '',
    qr_data: '@jax_ck'
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
    telegramChat: '',
    telegramId: '',
    apiDeposit: '',
    qr_data: '@fazlies'
  }
];

async function syncUsersToSupabase() {
  console.log('🔄 Menyinkronkan data pengguna ke Supabase...');
  for (const u of defaultUsers) {
    const email = u.email || `${u.username.replace(/^@/, '')}@sampulkreativ.id`;
    const query = `
      INSERT INTO public.users (
        id, name, full_name, username, role, title, jobdesk, email,
        nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name,
        assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at
      ) VALUES (
        $1, $2, $2, $3, $4, $5, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18::jsonb, NOW()
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
        qr_data = EXCLUDED.qr_data,
        workspace_access = EXCLUDED.workspace_access,
        updated_at = NOW()
    `;
    await pool.query(query, [
      u.id, u.fullName, u.username, u.role, u.position, email,
      u.nip, u.position, u.school, u.assignedProjectId, u.assignedWorkspace, u.assignedBoardName,
      u.assignedTaskId, u.assignedTaskTitle, u.device, u.isDeviceBound, u.qr_data, JSON.stringify([u.assignedWorkspace])
    ]);
    console.log(`✅ Berhasil menyimpan ke Supabase: ${u.fullName} (${u.username})`);
  }

  const check = await pool.query('SELECT id, name, username, role, position, assigned_board_name FROM public.users ORDER BY created_at ASC');
  console.log('\n📋 Daftar Semua Pengguna di Database Supabase:');
  console.table(check.rows);
  await pool.end();
}

syncUsersToSupabase().catch(err => {
  console.error('❌ Error syncing to Supabase:', err);
  pool.end();
});
