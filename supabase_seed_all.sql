-- =========================================================================
-- SCRIPT INJEKSI OTOMATIS KE SUPABASE (CreativOffice)
-- Salin seluruh teks ini, buka menu SQL Editor di Supabase Dashboard, lalu klik Run
-- Project: ysqqbygshqyhfhwdcswd (Management Project)
-- =========================================================================

-- 1. STRUKTUR KOLOM TABEL LENGKAP
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
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. INJEKSI 6 PAPAN PROYEK UTAMA (projects)
INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)
VALUES ('proj-1790146512680-427', 'LAYARBACA-2680', 'LayarBaca', 'Platform publikasi media baca dan kurasi konten kreatif editorial', 'layarbaca-2680', 'active', 'existing', 60, 'High', '18 Sep 2026', '30 Sep 2026', '[]'::jsonb, '{"total":5,"completed":0}'::jsonb, 'Rp 35.000.000', 'null'::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();

INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)
VALUES ('proj-1790146495006-9', 'RUANGKREASI-5006', 'Ruang Kreasi', 'Pusat kolaborasi ide, perancangan konsep kreatif dan media kreasi tim', 'ruangkreasi-5006', 'active', 'existing', 40, 'Medium', '15 Sep 2026', '15 Okt 2026', '[]'::jsonb, '{"total":2,"completed":0}'::jsonb, 'Rp 25.000.000', 'null'::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();

INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)
VALUES ('proj-1790146474472-592', 'SHARINGINAJA-4472', 'Sharinginaja', 'Platform modul pembelajaran kolaboratif, mentoring, dan transfer knowledge', 'sharinginaja-4472', 'active', 'existing', 55, 'High', '12 Sep 2026', '28 Sep 2026', '[]'::jsonb, '{"total":5,"completed":0}'::jsonb, 'Rp 40.000.000', 'null'::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();

INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)
VALUES ('proj-1790146459019-450', 'AIKREATIV-9019', 'AIKreativ', 'Studio otomatisasi dan pengembangan pipeline model AI visual interaktif', 'aikreativ-9019', 'active', 'existing', 70, 'Critical', '10 Sep 2026', '05 Okt 2026', '[]'::jsonb, '{"total":7,"completed":0}'::jsonb, 'Rp 60.000.000', 'null'::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();

INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)
VALUES ('proj-1790146434093-686', 'CREATIVOFFICE-4093', 'Creative Office', 'Sistem administrasi portal manajemen proyek, autentikasi single device QR & Kanban', 'creativoffice-4093', 'active', 'existing', 85, 'Critical', '01 Sep 2026', '30 Sep 2026', '[]'::jsonb, '{"total":5,"completed":0}'::jsonb, 'Rp 50.000.000', 'null'::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();

INSERT INTO public.projects (id, code, name, description, workspace, status, type, progress, priority, start_date, due_date, members, tasks_count, budget, theme, is_user_created, updated_at)
VALUES ('proj-1790146409036-876', 'PANEN-KUNCI-9036', 'Panen Kunci', 'Manajemen operasional backend core, multi-tenant database & keamanan payment SaaS', 'panen-kunci-9036', 'active', 'existing', 75, 'Critical', '05 Sep 2026', '30 Sep 2026', '[]'::jsonb, '{"total":7,"completed":0}'::jsonb, 'Rp 55.000.000', 'null'::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, workspace = EXCLUDED.workspace, tasks_count = EXCLUDED.tasks_count, updated_at = NOW();

-- 3. INJEKSI 7 PENGGUNA TERDAFTAR (users)
INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146619716', 'Fakhrul Miandi Rachman', 'Fakhrul Miandi Rachman', '@jax_ck', 'student', 'Siswa PKL', 'Siswa PKL', 'jax_ck@sampulkreativ.id', '2026', 'Siswa PKL', '', 'proj-1790146409036-876', 'panen-kunci-9036', 'Panen Kunci', 'all', 'Seluruh Papan (Semua Tugas)', 'Belum Terikat', false, '@jax_ck', '["proj-1790146409036-876"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146648510', 'Siti Asti Nurjanah', 'Siti Asti Nurjanah', '@stastii', 'student', 'Siswa PKL', 'Siswa PKL', 'stastii@sampulkreativ.id', '2026', 'Siswa PKL', '', 'proj-1790146409036-876', 'panen-kunci-9036', 'Panen Kunci', 'all', 'Seluruh Papan (Semua Tugas)', 'Belum Terikat', false, '@stastii', '["proj-1790146409036-876"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146707502', 'Mubarokah Denis Pratama', 'Mubarokah Denis Pratama', '@jambul004', 'student', 'Siswa PKL', 'Siswa PKL', 'jambul004@sampulkreativ.id', '2026', 'Siswa PKL', '', 'proj-1790146409036-876', 'panen-kunci-9036', 'Panen Kunci', 'all', 'Seluruh Papan (Semua Tugas)', 'Belum Terikat', false, '@jambul004', '["proj-1790146409036-876"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146750822', 'Nazwa Aulia Latifah', 'Nazwa Aulia Latifah', '@nazwaauliaal', 'student', 'Siswa PKL', 'Siswa PKL', 'nazwaauliaal@sampulkreativ.id', '2026', 'Siswa PKL', '', 'proj-1790146434093-686', 'creativoffice-4093', 'CreativOffice', 'all', 'Seluruh Papan (Semua Tugas)', 'Belum Terikat', false, '@nazwaauliaal', '["proj-1790146434093-686"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146790072', 'Muhamad Fazli Esfandiar', 'Muhamad Fazli Esfandiar', '@fazlies', 'student', '2026', '2026', 'fazlies@sampulkreativ.id', '2026', '2026', '', 'proj-1790146434093-686', 'creativoffice-4093', 'CreativOffice', 'all', 'Seluruh Papan (Semua Tugas)', 'Belum Terikat', false, '@fazlies', '["proj-1790146434093-686"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146861189', 'Ahmadi Jaka Abdul Manaf', 'Ahmadi Jaka Abdul Manaf', '@cardinal', 'employee', 'Backend Developer', 'Backend Developer', 'cardinal@sampulkreativ.id', '2026', 'Backend Developer', '', 'proj-1790146474472-592', 'sharinginaja-4472', 'SharinginAja', 'all', 'Seluruh Papan (2 Papan Terpilih)', 'Belum Terikat', false, '@cardinal', '["proj-1790146474472-592","proj-1790146459019-450"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

INSERT INTO public.users (id, name, full_name, username, role, title, jobdesk, email, nip, position, school, assigned_project_id, assigned_workspace, assigned_board_name, assigned_task_id, assigned_task_title, device, is_device_bound, qr_data, workspace_access, updated_at)
VALUES ('usr-1790146913655', 'Muhammad Yusar Ghani', 'Muhammad Yusar Ghani', '@yusariusly', 'employee', 'Frontend Developer', 'Frontend Developer', 'yusariusly@sampulkreativ.id', '2026', 'Frontend Developer', '', 'proj-1790146512680-427', 'layarbaca-2680', 'LayarBaca', 'all', 'Seluruh Papan (2 Papan Terpilih)', 'Belum Terikat', false, '@yusariusly', '["proj-1790146512680-427","proj-1790146495006-9"]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role, position = EXCLUDED.position, assigned_project_id = EXCLUDED.assigned_project_id, assigned_workspace = EXCLUDED.assigned_workspace, assigned_board_name = EXCLUDED.assigned_board_name, assigned_task_id = EXCLUDED.assigned_task_id, assigned_task_title = EXCLUDED.assigned_task_title, updated_at = NOW();

-- 4. INJEKSI 31 TUGAS KANBAN (tasks)
INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-1790146512958-443', '#L-102', 'Penyusunan Rencana Kerja & Kebutuhan Ruang Kerja LayarBaca', 'Penyusunan alokasi workstation tim redaksi, jadwal rilis berkala naskah, dan pengadaan aset desain media baca digital.', 'layarbaca-2680', 'kampanye-q3', 'in-progress', 'High', '{"name":"Muhammad Yusar Ghani","initials":"YG","role":"Frontend Developer"}'::jsonb, '18 - 25 Sep', 16, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, true, '["LayarBaca","Perencanaan"]'::jsonb, '', '', 'proj-1790146512680-427', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-1790146512956-637', '#L-101', 'Kickoff & Ruang Lingkup: LayarBaca', 'Penetapan sasaran tim editorial, pembagian PIC, dan alur pengerjaan papan LayarBaca.', 'layarbaca-2680', 'kampanye-q3', 'review-qa', 'Critical', '{"name":"Kevin Santoso","initials":"KS","role":"DevOps & Security"}'::jsonb, '15 - 22 Sep', 12, '[]'::jsonb, '{"passed":3,"total":3}'::jsonb, false, '["Kickoff"]'::jsonb, '', '', 'proj-1790146512680-427', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-lb-01', '#LB-101', 'Kickoff Redaksi & Kurasi Konten LayarBaca', 'Penetapan kalender publikasi, penugasan editor, dan kurasi naskah artikel.', 'layarbaca-2680', 'kampanye-q3', 'in-progress', 'High', '{"name":"Sari Rahmawati","initials":"SR","role":"Creative Lead"}'::jsonb, '18 - 25 Sep', 16, '[]'::jsonb, '{"passed":1,"total":3}'::jsonb, false, '["Editorial"]'::jsonb, '', '', 'proj-1790146512680-427', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-lb-02', '#LB-102', 'Desain Tata Letak & Tipografi Media Baca', 'Penyusunan format visual bacaan yang responsif dan nyaman untuk desktop dan mobile.', 'layarbaca-2680', 'kampanye-q3', 'backlog', 'Medium', '{"name":"Muhammad Yusar Ghani","initials":"YG","role":"Frontend Developer"}'::jsonb, '22 - 28 Sep', 12, '[]'::jsonb, '{"passed":0,"total":2}'::jsonb, false, '["UI/UX"]'::jsonb, '', '', 'proj-1790146512680-427', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-lb-03', '#LB-103', 'Verifikasi Kualitas Publikasi & Review Akhir', 'Pemeriksaan akhir tata bahasa, format e-reader, dan persetujuan rilis.', 'layarbaca-2680', 'kampanye-q3', 'ready-launch', 'Critical', '{"name":"Budi Pratama","initials":"BP","role":"QA Lead"}'::jsonb, '25 - 30 Sep', 14, '[]'::jsonb, '{"passed":3,"total":3}'::jsonb, false, '["QA"]'::jsonb, '', '', 'proj-1790146512680-427', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-rk-01', '#RK-101', 'Brainstorming Konsep Kreatif & Ruang Kolaborasi', 'Penetapan ide kreasi visual, media sharing antar tim, dan workspace digital kolaboratif.', 'ruangkreasi-5006', 'ideasi-kreatif', 'in-progress', 'High', '{"name":"Muhammad Yusar Ghani","initials":"YG","role":"Frontend Developer"}'::jsonb, '15 - 24 Sep', 18, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, true, '["Brainstorming"]'::jsonb, '', '', 'proj-1790146495006-9', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-rk-02', '#RK-102', 'Finalisasi Kurasi Proyek Ruang Kreasi', 'Verifikasi hasil karya tim dan persiapan showcase prototipe internal.', 'ruangkreasi-5006', 'ideasi-kreatif', 'ready-launch', 'Medium', '{"name":"Sari Rahmawati","initials":"SR","role":"Creative Lead"}'::jsonb, '25 - 30 Sep', 10, '[]'::jsonb, '{"passed":2,"total":2}'::jsonb, false, '["Showcase"]'::jsonb, '', '', 'proj-1790146495006-9', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-sh-01', '#SH-101', 'Perencanaan Konten Kolaborasi Tim & Sharing Session', 'Penyusunan silabus materi sharing antar karyawan dan siswa PKL seputar teknologi web.', 'sharinginaja-4472', 'sprint-1', 'in-progress', 'High', '{"name":"Ahmadi Jaka Abdul Manaf","initials":"AJ","role":"Backend Developer"}'::jsonb, '12 - 20 Sep', 14, '[]'::jsonb, '{"passed":1,"total":3}'::jsonb, false, '["Silabus"]'::jsonb, '', '', 'proj-1790146474472-592', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-sh-02', '#SH-102', 'Desain Asset Visual & Distribusi Modul', 'Pembuatan slide presentasi visual interaktif, template infografis, dan dokumentasi PDF.', 'sharinginaja-4472', 'sprint-1', 'backlog', 'Medium', '{"name":"Sari Rahmawati","initials":"SR","role":"Creative Lead"}'::jsonb, '18 - 25 Sep', 12, '[]'::jsonb, '{"passed":0,"total":2}'::jsonb, false, '["Asset"]'::jsonb, '', '', 'proj-1790146474472-592', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-sh-03', '#SH-103', 'Finalisasi Ulasan Mutu & Verifikasi QA', 'Uji fungsionalitas seluruh alur kerja proyek sebelum rilis.', 'sharinginaja-4472', 'sprint-1', 'ready-launch', 'Critical', '{"name":"Budi Pratama","initials":"BP","role":"QA Lead"}'::jsonb, '25 - 30 Sep', 14, '[]'::jsonb, '{"passed":3,"total":3}'::jsonb, false, '["QA"]'::jsonb, '', '', 'proj-1790146474472-592', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-sh-04', '#SH-104', 'Integrasi Feed Diskusi & Notifikasi Realtime', 'Implementasi forum tanya jawab dan websocket notifikasi untuk interaksi tim.', 'sharinginaja-4472', 'sprint-1', 'review-qa', 'High', '{"name":"Ahmadi Jaka Abdul Manaf","initials":"AJ","role":"Backend Developer"}'::jsonb, '20 - 27 Sep', 16, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, true, '["Backend","WebSocket"]'::jsonb, '', '', 'proj-1790146474472-592', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-sh-05', '#SH-105', 'Evaluasi Dampak Program & Dokumentasi Akhir', 'Pengumpulan testimoni, rekapitulasi rating materi, dan penyusunan laporan keberhasilan sesi.', 'sharinginaja-4472', 'sprint-1', 'backlog', 'Medium', '{"name":"Kevin Santoso","initials":"KS","role":"DevOps & Security"}'::jsonb, '26 - 30 Sep', 10, '[]'::jsonb, '{"passed":0,"total":2}'::jsonb, false, '["Laporan"]'::jsonb, '', '', 'proj-1790146474472-592', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-01', '#AI-101', 'Konfigurasi Model AI & Integrasi Vision API', 'Optimasi inference prompt dan response parser untuk pipeline visual.', 'aikreativ-9019', 'studio-ai', 'in-progress', 'High', '{"name":"Ahmadi Jaka Abdul Manaf","initials":"AJ","role":"Backend Developer"}'::jsonb, '18 - 24 Sep', 20, '[]'::jsonb, '{"passed":2,"total":4}'::jsonb, true, '["AI","Vision"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-02', '#AI-102', 'Implementasi Pipeline Otomasi & Webhook Server', 'Setup routing background worker dan queue microservice.', 'aikreativ-9019', 'studio-ai', 'backlog', 'Medium', '{"name":"Kevin Santoso","initials":"KS","role":"DevOps & Security"}'::jsonb, '20 - 26 Sep', 15, '[]'::jsonb, '{"passed":1,"total":3}'::jsonb, false, '["Pipeline"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-03', '#AI-103', 'Audit Latensi & Quality Assurance Model AI', 'Pengujian throughput pemrosesan data di server staging.', 'aikreativ-9019', 'studio-ai', 'review-qa', 'Critical', '{"name":"Budi Pratama","initials":"BP","role":"QA Lead"}'::jsonb, '22 - 28 Sep', 18, '[]'::jsonb, '{"passed":3,"total":4}'::jsonb, false, '["QA","Benchmark"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-04', '#AI-104', 'Deploy Model ke Staging & Integrasi Frontend', 'Verifikasi integrasi websocket dan update real-time antarmuka.', 'aikreativ-9019', 'studio-ai', 'ready-launch', 'High', '{"name":"Budi Pratama","initials":"BP","role":"QA Lead"}'::jsonb, '24 - 30 Sep', 14, '[]'::jsonb, '{"passed":4,"total":4}'::jsonb, false, '["Deployment"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-05', '#AI-105', 'Optimasi Token Prompt & Fine-tuning Dataset', 'Pengurangan biaya komputasi token LLM hingga 35% tanpa mengurangi akurasi hasil sintesis.', 'aikreativ-9019', 'studio-ai', 'in-progress', 'High', '{"name":"Ahmadi Jaka Abdul Manaf","initials":"AJ","role":"Backend Developer"}'::jsonb, '15 - 23 Sep', 16, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, false, '["LLM","Fine-tuning"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-06', '#AI-106', 'Testing Stress Benchmark & Monitoring GPU', 'Simulasi beban 1.000 concurrent request terhadap cluster inference GPU cloud.', 'aikreativ-9019', 'studio-ai', 'backlog', 'Critical', '{"name":"Kevin Santoso","initials":"KS","role":"DevOps & Security"}'::jsonb, '26 - 30 Sep', 18, '[]'::jsonb, '{"passed":1,"total":4}'::jsonb, false, '["StressTest"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-ai-07', '#AI-107', 'Dokumentasi Integrasi Arsitektur AI Studio', 'Penyusunan API docs dan panduan developer untuk integrasi model ke aplikasi lain.', 'aikreativ-9019', 'studio-ai', 'ready-launch', 'Medium', '{"name":"Sari Rahmawati","initials":"SR","role":"Creative Lead"}'::jsonb, '28 - 30 Sep', 12, '[]'::jsonb, '{"passed":3,"total":3}'::jsonb, false, '["Docs"]'::jsonb, '', '', 'proj-1790146459019-450', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-co-01', '#CO-101', 'Pengembangan Prototype CreativOffice Mobile & Web', 'Implementasi antarmuka eksekutif, integrasi QR barcode scanner, dan kanban task board.', 'creativoffice-4093', 'creativoffice', 'in-progress', 'High', '{"name":"Nazwa Aulia Latifah","initials":"NA","role":"Siswa PKL"}'::jsonb, '18 - 25 Sep', 20, '[]'::jsonb, '{"passed":3,"total":4}'::jsonb, true, '["UI","Prototype"]'::jsonb, '', '', 'proj-1790146434093-686', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-co-02', '#CO-102', 'Integrasi Single Device Lock & Supabase Sync', 'Validasi QR Sampulkreativ, penugasan otomatis tugas, dan enkripsi token.', 'creativoffice-4093', 'creativoffice', 'review-qa', 'Critical', '{"name":"Muhamad Fazli Esfandiar","initials":"FE","role":"Siswa PKL"}'::jsonb, '20 - 27 Sep', 16, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, false, '["Security","DeviceLock"]'::jsonb, '', '', 'proj-1790146434093-686', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-co-03', '#CO-103', 'Penyusunan Manajemen Pengguna & Delegasi Tugas', 'Pengaturan penugasan peran pegawai/siswa ke kanban board masing-masing.', 'creativoffice-4093', 'creativoffice', 'ready-launch', 'Medium', '{"name":"Nazwa Aulia Latifah","initials":"NA","role":"Siswa PKL"}'::jsonb, '22 - 28 Sep', 14, '[]'::jsonb, '{"passed":3,"total":3}'::jsonb, false, '["Users"]'::jsonb, '', '', 'proj-1790146434093-686', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-co-04', '#CO-104', 'Implementasi Realtime Synchronization & EventBus', 'Sinkronisasi perubahan status antar tab dan multi-device secara instan.', 'creativoffice-4093', 'creativoffice', 'in-progress', 'High', '{"name":"Muhamad Fazli Esfandiar","initials":"FE","role":"Siswa PKL"}'::jsonb, '21 - 28 Sep', 15, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, false, '["Realtime"]'::jsonb, '', '', 'proj-1790146434093-686', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-co-05', '#CO-105', 'Pengujian Responsivitas UI Multi-Device (Desktop, Tablet, Mobile)', 'Verifikasi tampilan bebas overlap dan konsistensi tombol di seluruh resolusi layar.', 'creativoffice-4093', 'creativoffice', 'backlog', 'Medium', '{"name":"Budi Pratama","initials":"BP","role":"QA Lead"}'::jsonb, '24 - 30 Sep', 12, '[]'::jsonb, '{"passed":1,"total":3}'::jsonb, false, '["Responsive"]'::jsonb, '', '', 'proj-1790146434093-686', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-01', '#PK-401', 'Konfigurasi Redis Cache & Auth Microservice OAuth2', 'Optimasi token validation store ke Redis cluster dengan target latensi <5ms.', 'panen-kunci-9036', 'backend-core', 'in-progress', 'High', '{"name":"Fakhrul Miandi Rachman","initials":"FR","role":"Siswa PKL"}'::jsonb, '18 - 24 Sep', 22, '[]'::jsonb, '{"passed":2,"total":4}'::jsonb, true, '["Backend","Redis"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-02', '#PK-402', 'Audit Keamanan Penetration Testing Multi-Tenant', 'Verifikasi isolasi database tenant dan enkripsi data at rest AES-256.', 'panen-kunci-9036', 'backend-core', 'review-qa', 'Critical', '{"name":"Siti Asti Nurjanah","initials":"SA","role":"Siswa PKL"}'::jsonb, '20 - 26 Sep', 18, '[]'::jsonb, '{"passed":3,"total":4}'::jsonb, false, '["Security","Audit"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-03', '#PK-403', 'Pemeriksaan SLA & Integrasi Payment Gateway SaaS', 'Pengujian webhook callback redundan untuk transaksi otomatis.', 'panen-kunci-9036', 'backend-core', 'ready-launch', 'High', '{"name":"Mubarokah Denis Pratama","initials":"DP","role":"Siswa PKL"}'::jsonb, '22 - 28 Sep', 16, '[]'::jsonb, '{"passed":4,"total":4}'::jsonb, false, '["Payment"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-04', '#PK-404', 'Setup Monitoring Datadog & CloudWatch Alerts', 'Pemberitahuan otomatis saat latency API melebihi threshold 200ms.', 'panen-kunci-9036', 'backend-core', 'done', 'Medium', '{"name":"Fakhrul Miandi Rachman","initials":"FR","role":"Siswa PKL"}'::jsonb, '10 - 15 Sep', 12, '[]'::jsonb, '{"passed":4,"total":4}'::jsonb, false, '["Monitoring"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-05', '#PK-405', 'Dokumentasi OpenAPI & Swagger RESTful Endpoints', 'Penyusunan panduan integrasi third-party API untuk mitra platform.', 'panen-kunci-9036', 'backend-core', 'backlog', 'Medium', '{"name":"Siti Asti Nurjanah","initials":"SA","role":"Siswa PKL"}'::jsonb, '25 - 30 Sep', 14, '[]'::jsonb, '{"passed":0,"total":3}'::jsonb, false, '["Swagger"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-06', '#PK-406', 'Optimasi Query Database & Penanganan Deadlock', 'Penerapan indeks gabungan dan query analyzer untuk menjaga waktu respons <100ms.', 'panen-kunci-9036', 'backend-core', 'in-progress', 'High', '{"name":"Mubarokah Denis Pratama","initials":"DP","role":"Siswa PKL"}'::jsonb, '19 - 26 Sep', 16, '[]'::jsonb, '{"passed":2,"total":3}'::jsonb, false, '["Database"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

INSERT INTO public.tasks (id, code, title, description, workspace, board, status, priority, pic, timeline, hours, assets, qa_progress, is_starred, tags, location, resolution, project_id, updated_at)
VALUES ('task-pk-07', '#PK-407', 'Review Keamanan Endpoint QR Scanner & Device Signature', 'Pemeriksaan validasi fingerprint ganda dan sanitasi payload scan.', 'panen-kunci-9036', 'backend-core', 'review-qa', 'Critical', '{"name":"Kevin Santoso","initials":"KS","role":"DevOps & Security"}'::jsonb, '23 - 29 Sep', 15, '[]'::jsonb, '{"passed":3,"total":4}'::jsonb, false, '["Security"]'::jsonb, '', '', 'proj-1790146409036-876', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, workspace = EXCLUDED.workspace, status = EXCLUDED.status, priority = EXCLUDED.priority, pic = EXCLUDED.pic, updated_at = NOW();

