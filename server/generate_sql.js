import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8'));
const projects = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'projects.json'), 'utf8'));
const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tasks.json'), 'utf8'));

let sql = `-- =========================================================================
-- SCRIPT INJEKSI OTOMATIS KE SUPABASE (CreativOffice)
-- Salin seluruh teks ini, buka menu SQL Editor di Supabase Dashboard, lalu klik Run
-- Project: ysqqbygshqyhfhwdcswd (Management Project)
-- =========================================================================\n\n`;

sql += `-- 1. STRUKTUR KOLOM TABEL LENGKAP
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS nip VARCHAR(50);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS position VARCHAR(150);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS school VARCHAR(150);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS assigned_project_id VARCHAR(100);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS assigned_workspace VARCHAR(100);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS assigned_board_name VARCHAR(150);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS assigned_task_id VARCHAR(100);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS assigned_task_title VARCHAR(255);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS device VARCHAR(255);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS is_device_bound BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS qr_data VARCHAR(255);
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS workspace_access JSONB;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();\n\n`;

sql += `-- 2. INJEKSI 6 PAPAN PROYEK UTAMA (projects)\n`;
for (const p of projects) {
  const code = (p.code || '').replace(/'/g, "''");
  const name = (p.name || '').replace(/'/g, "''");
  const desc = (p.description || '').replace(/'/g, "''");
  const ws = (p.workspace || '').replace(/'/g, "''");
  const status = (p.status || 'active').replace(/'/g, "''");
  const type = (p.type || 'existing').replace(/'/g, "''");
  const priority = (p.priority || 'Medium').replace(/'/g, "''");
  const start = (p.startDate || '').replace(/'/g, "''");
  const due = (p.dueDate || '').replace(/'/g, "''");
  const budget = (p.budget || '').replace(/'/g, "''");
  const members = JSON.stringify(p.members || []).replace(/'/g, "''");
  const tasksCount = JSON.stringify(p.tasksCount || { total: 0, completed: 0 }).replace(/'/g, "''");
  const theme = JSON.stringify(p.theme || null).replace(/'/g, "''");

  sql += `INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)\n`;
  sql += `VALUES ('${p.id}', '${code}', '${name}', '${desc}', '${ws}', '${status}', '${type}', ${p.progress || 0}, '${priority}', '${start}', '${due}', '${members}'::jsonb, '${tasksCount}'::jsonb, '${budget}', '${theme}'::jsonb, true, NOW())\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();\n\n`;
}

sql += `-- 3. INJEKSI 7 PENGGUNA TERDAFTAR (users)\n`;
for (const u of users) {
  const fn = (u.fullName || u.name || '').replace(/'/g, "''");
  const un = (u.username || '').replace(/'/g, "''");
  const role = (u.role || 'student').replace(/'/g, "''");
  const pos = (u.position || '').replace(/'/g, "''");
  const nip = (u.nip || '').replace(/'/g, "''");
  const school = (u.school || '').replace(/'/g, "''");
  const pId = (u.assignedProjectId || '').replace(/'/g, "''");
  const ws = (u.assignedWorkspace || '').replace(/'/g, "''");
  const bName = (u.assignedBoardName || '').replace(/'/g, "''");
  const tId = (u.assignedTaskId || 'all').replace(/'/g, "''");
  const tTitle = (u.assignedTaskTitle || '').replace(/'/g, "''");
  const dev = (u.device || 'Belum Terikat').replace(/'/g, "''");
  const email = (u.email || (un.replace(/^@/, '') + '@sampulkreativ.id')).replace(/'/g, "''");
  const wsAcc = JSON.stringify(u.workspaceAccess || [ws]).replace(/'/g, "''");

  sql += `INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)\n`;
  sql += `VALUES ('${u.id}', '${fn}', '${fn}', '${un}', '${role}', '${pos}', '${pos}', '${email}', '${nip}', '${pos}', '${school}', '${pId}', '${ws}', '${bName}', '${tId}', '${tTitle}', '${dev}', false, '${un}', '${wsAcc}'::jsonb, NOW())\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();\n\n`;
}

sql += `-- 4. INJEKSI 31 TUGAS KANBAN (tasks)\n`;
for (const t of tasks) {
  const code = (t.code || '').replace(/'/g, "''");
  const title = (t.title || '').replace(/'/g, "''");
  const desc = (t.description || '').replace(/'/g, "''");
  const ws = (t.workspace || '').replace(/'/g, "''");
  const board = (t.board || 'backend-core').replace(/'/g, "''");
  const status = (t.status || 'in-progress').replace(/'/g, "''");
  const priority = (t.priority || 'Medium').replace(/'/g, "''");
  const timeline = (t.timeline || '').replace(/'/g, "''");
  const hours = Number(t.hours) || 0;
  const pic = JSON.stringify(t.pic || {}).replace(/'/g, "''");
  const assets = JSON.stringify(t.assets || []).replace(/'/g, "''");
  const qa = JSON.stringify(t.qaProgress || { passed: 0, total: 4 }).replace(/'/g, "''");
  const tags = JSON.stringify(t.tags || []).replace(/'/g, "''");
  const pId = t.projectId ? `'${t.projectId.replace(/'/g, "''")}'` : 'NULL';

  sql += `INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)\n`;
  sql += `VALUES ('${t.id}', '${code}', '${title}', '${desc}', '${ws}', '${board}', '${status}', '${priority}', '${pic}'::jsonb, '${timeline}', ${hours}, '${assets}'::jsonb, '${qa}'::jsonb, ${Boolean(t.isStarred)}, '${tags}'::jsonb, '', '', ${pId}, NOW())\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();\n\n`;
}

fs.writeFileSync(path.join(__dirname, '..', 'supabase_seed_all.sql'), sql);
console.log('✅ File supabase_seed_all.sql berhasil digenerate!');
