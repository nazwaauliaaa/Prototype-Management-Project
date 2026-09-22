import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Pastikan direktori data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inisialisasi seed tasks default jika belum ada
const DEFAULT_SEED_TASKS = [
  {
    id: 'task-pk-01',
    code: '#PK-401',
    title: 'Konfigurasi Redis Cache & Auth Microservice OAuth2',
    description: 'Optimasi token validation store ke Redis cluster dengan target latensi <5ms.',
    workspace: 'panen-kunci',
    board: 'backend-core',
    status: 'in-progress',
    priority: 'High',
    pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
    timeline: '18 - 24 Sep',
    hours: 22,
    qaProgress: { passed: 2, total: 4 },
    isStarred: false,
    updatedAt: Date.now()
  },
  {
    id: 'task-pk-02',
    code: '#PK-402',
    title: 'Audit Keamanan Penetration Testing Multi-Tenant',
    description: 'Verifikasi isolasi database tenant dan enkripsi data at rest AES-256.',
    workspace: 'panen-kunci',
    board: 'backend-core',
    status: 'review-qa',
    priority: 'Critical',
    pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
    timeline: '20 - 26 Sep',
    hours: 18,
    qaProgress: { passed: 3, total: 4 },
    isStarred: false,
    updatedAt: Date.now()
  },
  {
    id: 'task-pk-03',
    code: '#PK-403',
    title: 'Pemeriksaan SLA & Integrasi Payment Gateway SaaS',
    description: 'Pengujian webhook callback redundan untuk transaksi otomatis.',
    workspace: 'panen-kunci',
    board: 'backend-core',
    status: 'ready-launch',
    priority: 'High',
    pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
    timeline: '22 - 28 Sep',
    hours: 16,
    qaProgress: { passed: 4, total: 4 },
    isStarred: false,
    updatedAt: Date.now()
  },
  {
    id: 'task-pk-04',
    code: '#PK-404',
    title: 'Setup Monitoring Datadog & CloudWatch Alerts',
    description: 'Pemberitahuan otomatis saat latency API melebihi threshold 200ms.',
    workspace: 'panen-kunci',
    board: 'backend-core',
    status: 'done',
    priority: 'Medium',
    pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
    timeline: '10 - 15 Sep',
    hours: 12,
    qaProgress: { passed: 4, total: 4 },
    isStarred: false,
    updatedAt: Date.now()
  },
  {
    id: 'task-pk-05',
    code: '#PK-405',
    title: 'Dokumentasi OpenAPI & Swagger RESTful Endpoints',
    description: 'Penyusunan panduan integrasi third-party API untuk mitra platform.',
    workspace: 'panen-kunci',
    board: 'backend-core',
    status: 'backlog',
    priority: 'Medium',
    pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
    timeline: '25 - 30 Sep',
    hours: 14,
    qaProgress: { passed: 0, total: 3 },
    isStarred: false,
    updatedAt: Date.now()
  }
];

function readJsonFile(filePath, defaultVal) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
      return defaultVal;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content ? JSON.parse(content) : defaultVal;
  } catch (err) {
    console.error(`[fileStore] Error reading ${filePath}:`, err.message);
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[fileStore] Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Inisialisasi file saat module dimuat
if (!fs.existsSync(TASKS_FILE)) {
  writeJsonFile(TASKS_FILE, DEFAULT_SEED_TASKS);
}

if (!fs.existsSync(PROJECTS_FILE)) {
  writeJsonFile(PROJECTS_FILE, []);
}

export const fileStore = {
  // ================= TASKS =================
  getTasks(workspace = null, projectId = null) {
    let tasks = readJsonFile(TASKS_FILE, DEFAULT_SEED_TASKS);
    if (workspace && workspace !== 'all') {
      const wsLower = workspace.toLowerCase();
      tasks = tasks.filter(t => {
        const tWs = (t.workspace || '').toLowerCase();
        const tProj = (t.projectId || '').toLowerCase();
        return tWs === wsLower || tProj === wsLower;
      });
    }
    if (projectId) {
      const pLower = projectId.toLowerCase();
      tasks = tasks.filter(t => (t.projectId || '').toLowerCase() === pLower);
    }
    return tasks;
  },

  getTask(id) {
    const tasks = readJsonFile(TASKS_FILE, DEFAULT_SEED_TASKS);
    return tasks.find(t => String(t.id) === String(id) || String(t.code) === String(id)) || null;
  },

  saveTask(taskData) {
    const tasks = readJsonFile(TASKS_FILE, DEFAULT_SEED_TASKS);
    const id = taskData.id || 'task-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
    const existingIndex = tasks.findIndex(t => String(t.id) === String(id));

    const taskObj = {
      id,
      code: taskData.code || `#PK-${Math.floor(100 + Math.random() * 900)}`,
      title: taskData.title || 'Tugas Baru',
      description: taskData.description || '',
      workspace: taskData.workspace || 'panen-kunci',
      board: taskData.board || 'backend-core',
      status: taskData.status || 'in-progress',
      priority: taskData.priority || 'Medium',
      pic: taskData.pic || { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
      timeline: taskData.timeline || '',
      hours: Number(taskData.hours) || 0,
      assets: taskData.assets || [],
      qaProgress: taskData.qaProgress || taskData.qa_progress || { passed: 0, total: 4 },
      isStarred: Boolean(taskData.isStarred),
      tags: taskData.tags || [],
      location: taskData.location || '',
      resolution: taskData.resolution || '',
      projectId: taskData.projectId || taskData.project_id || null,
      updatedAt: Date.now()
    };

    if (existingIndex !== -1) {
      tasks[existingIndex] = { ...tasks[existingIndex], ...taskObj };
    } else {
      tasks.unshift(taskObj);
    }

    writeJsonFile(TASKS_FILE, tasks);
    console.log(`[fileStore] 💾 Saved task "${taskObj.title}" (${taskObj.id})`);
    return taskObj;
  },

  updateTask(id, updates) {
    const tasks = readJsonFile(TASKS_FILE, DEFAULT_SEED_TASKS);
    const index = tasks.findIndex(t => String(t.id) === String(id) || String(t.code) === String(id));
    if (index === -1) {
      // Jika belum ada, buat baru
      return this.saveTask({ id, ...updates });
    }

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: Date.now()
    };

    writeJsonFile(TASKS_FILE, tasks);
    console.log(`[fileStore] 🔄 Updated task "${tasks[index].title}" (${id})`);
    return tasks[index];
  },

  deleteTask(id) {
    const tasks = readJsonFile(TASKS_FILE, DEFAULT_SEED_TASKS);
    const index = tasks.findIndex(t => String(t.id) === String(id));
    if (index !== -1) {
      const removed = tasks.splice(index, 1)[0];
      writeJsonFile(TASKS_FILE, tasks);
      console.log(`[fileStore] 🗑️ Deleted task (${id})`);
      return removed;
    }
    return null;
  },

  // ================= PROJECTS =================
  getProjects(workspace = null) {
    let projects = readJsonFile(PROJECTS_FILE, []);
    if (workspace && workspace !== 'all') {
      const wsLower = workspace.toLowerCase();
      projects = projects.filter(p => (p.workspace || '').toLowerCase() === wsLower);
    }
    return projects;
  },

  saveProject(projectData) {
    const projects = readJsonFile(PROJECTS_FILE, []);
    const id = projectData.id || 'proj-' + Date.now();
    const existingIndex = projects.findIndex(p => String(p.id) === String(id));

    const projObj = {
      ...projectData,
      id,
      updatedAt: Date.now()
    };

    if (existingIndex !== -1) {
      projects[existingIndex] = { ...projects[existingIndex], ...projObj };
    } else {
      projects.unshift(projObj);
    }

    writeJsonFile(PROJECTS_FILE, projects);
    return projObj;
  },

  updateProject(id, updates) {
    const projects = readJsonFile(PROJECTS_FILE, []);
    const index = projects.findIndex(p => String(p.id) === String(id));
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates, updatedAt: Date.now() };
      writeJsonFile(PROJECTS_FILE, projects);
      return projects[index];
    }
    return null;
  },

  deleteProject(id) {
    const projects = readJsonFile(PROJECTS_FILE, []);
    const index = projects.findIndex(p => String(p.id) === String(id));
    if (index !== -1) {
      const removed = projects.splice(index, 1)[0];
      writeJsonFile(PROJECTS_FILE, projects);
      return removed;
    }
    return null;
  },

  // ================= MANAGED USERS (Manajemen Pengguna) =================
  getManagedUsers() {
    const defaultManagedUsers = [
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

    let users = readJsonFile(USERS_FILE, defaultManagedUsers);
    if (!Array.isArray(users) || users.length === 0) {
      users = defaultManagedUsers;
      writeJsonFile(USERS_FILE, users);
    }
    return users;
  },

  saveManagedUsers(usersList) {
    if (!Array.isArray(usersList)) return [];
    writeJsonFile(USERS_FILE, usersList);
    console.log(`[fileStore] 👥 Saved ${usersList.length} managed users`);
    return usersList;
  },

  saveManagedUser(userData) {
    const users = this.getManagedUsers();
    const id = userData.id || 'usr-' + Date.now();
    const index = users.findIndex(u => String(u.id) === String(id) || (u.username && userData.username && u.username.toLowerCase() === userData.username.toLowerCase()));

    const userObj = {
      ...userData,
      id,
      updatedAt: Date.now()
    };

    if (index !== -1) {
      users[index] = { ...users[index], ...userObj };
    } else {
      users.unshift(userObj);
    }

    writeJsonFile(USERS_FILE, users);
    console.log(`[fileStore] 👤 Saved managed user "${userObj.fullName || userObj.username}" (${id})`);
    return users[index !== -1 ? index : 0];
  },

  deleteManagedUser(id) {
    const users = this.getManagedUsers();
    const index = users.findIndex(u => String(u.id) === String(id));
    if (index !== -1) {
      const removed = users.splice(index, 1)[0];
      writeJsonFile(USERS_FILE, users);
      console.log(`[fileStore] 🗑️ Deleted managed user (${id})`);
      return removed;
    }
    return null;
  }
};
