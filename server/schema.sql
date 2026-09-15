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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
