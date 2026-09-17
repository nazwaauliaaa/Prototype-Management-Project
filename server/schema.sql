-- Schema Database PostgreSQL untuk Portal Manajemen Proyek

-- 1. Tabel Proyek (Projects)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    workspace VARCHAR(100) DEFAULT 'ruangkreasi',
    status VARCHAR(50) DEFAULT 'active',
    type VARCHAR(50) DEFAULT 'existing',
    progress INTEGER DEFAULT 0,
    priority VARCHAR(50) DEFAULT 'Medium',
    start_date VARCHAR(50) DEFAULT '',
    due_date VARCHAR(50) DEFAULT '',
    members JSONB DEFAULT '[]'::jsonb,
    tasks_count JSONB DEFAULT '{"total": 0, "completed": 0}'::jsonb,
    budget VARCHAR(100) DEFAULT '',
    theme JSONB DEFAULT NULL,
    is_user_created BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Tugas (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    workspace VARCHAR(100) DEFAULT 'ruangkreasi',
    board VARCHAR(100) DEFAULT 'kampanye-q3',
    status VARCHAR(50) DEFAULT 'in-progress',
    priority VARCHAR(50) DEFAULT 'Medium',
    pic JSONB DEFAULT '{"name": "Sari Rahmawati", "avatar": "", "initials": "SR"}'::jsonb,
    timeline VARCHAR(100) DEFAULT '',
    hours NUMERIC(5, 2) DEFAULT 0,
    assets JSONB DEFAULT '[]'::jsonb,
    qa_progress JSONB DEFAULT '{"passed": 0, "total": 4}'::jsonb,
    is_starred BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb,
    location VARCHAR(255) DEFAULT '',
    resolution VARCHAR(255) DEFAULT '',
    project_id VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- 3. Tabel Pengguna (Users & Anggota Tim)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    title VARCHAR(150) DEFAULT 'Creative Staff',
    jobdesk VARCHAR(255) DEFAULT 'Anggota Tim & Kontributor',
    avatar TEXT DEFAULT '',
    email VARCHAR(150) UNIQUE,
    workspace_access JSONB DEFAULT '["ruangkreasi"]'::jsonb,
    bound_device_id VARCHAR(255) DEFAULT NULL,
    bound_device_name VARCHAR(255) DEFAULT NULL,
    bound_at TIMESTAMPTZ DEFAULT NULL,
    is_locked_to_device BOOLEAN DEFAULT true,
    qr_data TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Seed Pengguna Awal
INSERT INTO users (id, name, role, title, jobdesk, email, avatar, workspace_access, qr_data)
VALUES 
  ('usr-001', 'Dr. Hendra Wijaya', 'admin', 'Admin & Managing Director', 'Direktur Eksekutif & Manajemen Operasional', 'hendra.wijaya@sampulkreativ.id', '', '["ruangkreasi", "layarbaca"]'::jsonb, NULL),
  ('usr-002', 'Sari Rahmawati', 'manajement-project', 'Project Manager', 'Lead Operasional & Sprint Coordinator', 'sari.rahmawati@sampulkreativ.id', '', '["ruangkreasi", "layarbaca"]'::jsonb, NULL),
  ('usr-003', 'Budi Pratama', 'qa', 'QA Lead', 'Quality Assurance & Kelaikan Deliverable', 'budi.pratama@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, NULL),
  ('usr-004', 'Dimas Anggara', 'user', 'Creative Specialist', 'Desain Grafis & Konten Visual 3D', 'dimas.anggara@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, '{\n  "nama": "Dimas Anggara",\n  "role": "User",\n  "jobdesk": "Desain Grafis & Konten Visual 3D"\n}'),
  ('usr-005', 'Rizky Firmansyah', 'user', 'UI/UX Designer', 'Perancangan Antarmuka & Prototipe Web', 'rizky.firmansyah@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, '{\n  "nama": "Rizky Firmansyah",\n  "role": "User",\n  "jobdesk": "Perancangan Antarmuka & Prototipe Web"\n}'),
  ('usr-006', 'Dewi Sartika', 'user', 'Content Strategist', 'Penulisan Naskah & Strategi Publikasi', 'dewi.sartika@sampulkreativ.id', '', '["ruangkreasi"]'::jsonb, '{\n  "nama": "Dewi Sartika",\n  "role": "User",\n  "jobdesk": "Penulisan Naskah & Strategi Publikasi"\n}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  title = EXCLUDED.title,
  jobdesk = EXCLUDED.jobdesk,
  email = EXCLUDED.email,
  avatar = EXCLUDED.avatar,
  workspace_access = EXCLUDED.workspace_access,
  qr_data = EXCLUDED.qr_data,
  updated_at = NOW();

