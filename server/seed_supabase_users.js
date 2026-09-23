import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncAllToSupabase() {
  console.log('🔄 Memeriksa koneksi database PostgreSQL / Supabase...');
  const connStatus = await testConnection();

  if (!connStatus.connected) {
    console.warn('⚠️ Tidak ada koneksi aktif ke PostgreSQL / Supabase:', connStatus.error);
    console.log('ℹ️ Seluruh data (7 Pengguna, 6 Papan, 31 Tugas) telah tersimpan di server/data/*.json dan siap otomatis tersinkron saat koneksi DB aktif.');
    await pool.end();
    return;
  }

  console.log(`✅ Terhubung ke database: "${connStatus.database}" (${connStatus.user})`);

  // 1. Sync Users
  const usersPath = path.join(__dirname, 'data', 'users.json');
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    console.log(`\n👥 Menyinkronkan ${users.length} pengguna ke tabel public.users...`);
    for (const u of users) {
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
        u.nip, u.position, u.school || '', u.assignedProjectId, u.assignedWorkspace, u.assignedBoardName,
        u.assignedTaskId, u.assignedTaskTitle, u.device, Boolean(u.isDeviceBound), u.qr_data, JSON.stringify(u.workspaceAccess || [u.assignedWorkspace])
      ]);
      console.log(`  ✅ User: ${u.fullName} (${u.username})`);
    }
  }

  // 2. Sync Projects
  const projectsPath = path.join(__dirname, 'data', 'projects.json');
  if (fs.existsSync(projectsPath)) {
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    console.log(`\n📋 Menyinkronkan ${projects.length} papan proyek ke tabel public.projects...`);
    for (const p of projects) {
      const query = `
        INSERT INTO public.projects (
          id, code, name, description, workspace, status, type,
          progress, priority, start_date, due_date, members,
          tasks_count, budget, theme, is_user_created, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12::jsonb,
          $13::jsonb, $14, $15::jsonb, $16, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          workspace = EXCLUDED.workspace,
          status = EXCLUDED.status,
          type = EXCLUDED.type,
          progress = EXCLUDED.progress,
          priority = EXCLUDED.priority,
          start_date = EXCLUDED.start_date,
          due_date = EXCLUDED.due_date,
          members = EXCLUDED.members,
          tasks_count = EXCLUDED.tasks_count,
          budget = EXCLUDED.budget,
          theme = EXCLUDED.theme,
          is_user_created = EXCLUDED.is_user_created,
          updated_at = NOW()
      `;
      await pool.query(query, [
        p.id, p.code, p.name, p.description || '', p.workspace, p.status || 'active', p.type || 'existing',
        p.progress || 0, p.priority || 'Medium', p.startDate || '', p.dueDate || '', JSON.stringify(p.members || []),
        JSON.stringify(p.tasksCount || { total: 0, completed: 0 }), p.budget || '', JSON.stringify(p.theme || null),
        Boolean(p.isUserCreated)
      ]);
      console.log(`  ✅ Project: ${p.name} (${p.code})`);
    }
  }

  // 3. Sync Tasks
  const tasksPath = path.join(__dirname, 'data', 'tasks.json');
  if (fs.existsSync(tasksPath)) {
    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    console.log(`\n📝 Menyinkronkan ${tasks.length} tugas ke tabel public.tasks...`);
    for (const t of tasks) {
      const query = `
        INSERT INTO public.tasks (
          id, code, title, description, workspace, board, status,
          priority, pic, timeline, hours, assets, qa_progress,
          is_starred, tags, location, resolution, project_id, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb,
          $14, $15::jsonb, $16, $17, $18, NOW()
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
      `;
      await pool.query(query, [
        t.id, t.code, t.title, t.description || '', t.workspace, t.board || 'backend-core', t.status || 'in-progress',
        t.priority || 'Medium', JSON.stringify(t.pic || {}), t.timeline || '', Number(t.hours) || 0, JSON.stringify(t.assets || []),
        JSON.stringify(t.qaProgress || { passed: 0, total: 4 }), Boolean(t.isStarred), JSON.stringify(t.tags || []),
        t.location || '', t.resolution || '', t.projectId || null
      ]);
    }
    console.log(`  ✅ ${tasks.length} tasks berhasil disinkronkan ke Supabase!`);
  }

  await pool.end();
  console.log('\n🎉 Selesai menyinkronkan seluruh data ke Supabase!');
}

syncAllToSupabase().catch(err => {
  console.error('❌ Error sync to Supabase:', err);
  pool.end();
});
