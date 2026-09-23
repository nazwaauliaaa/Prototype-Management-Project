import { Task } from '../models/Task.js';
import { apiService } from './ApiService.js';
import { supabaseService } from './SupabaseService.js';

/**
 * TaskService - Single Responsibility Principle (SRP)
 * Manages project boards, tasks, statuses, priorities, with PostgreSQL backend sync & localStorage fallback.
 */
export class TaskService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.tasks = [];
    this.isSyncing = false;
    this.loadFromStorage();
    this.syncFromBackend();

    // Inisialisasi kanal sinkronisasi real-time antar-tab / multi-jendela
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('creative_office_sync_bus');
        this.channel.onmessage = (e) => {
          if (e.data && e.data.type === 'TASKS_MODIFIED') {
            this.loadFromStorage();
            if (this.eventBus) {
              this.eventBus.emit('tasks:updated', this.tasks);
            }
          }
        };
      } catch (e) {}
    }

    // Polling otomatis setiap 25 detik agar sinkronisasi background efisien dan tidak melebihi kuota API
    this.syncTimer = setInterval(() => {
      this.syncFromBackend(true);
    }, 25000);

    // Sinkronisasi instan saat user membuka tab / mengaktifkan layar HP
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncFromBackend(true);
        }
      });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncFromBackend(true);
      });
    }
  }

  broadcastLocalChange() {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'TASKS_MODIFIED', timestamp: Date.now() });
      } catch (e) {}
    }
  }

  /**
   * Cek apakah daftar tugas baru memiliki perbedaan dengan yang sedang aktif di memori
   */
  _hasTasksChanged(newTasks) {
    if (!this.tasks || this.tasks.length !== newTasks.length) return true;
    for (let i = 0; i < this.tasks.length; i++) {
      const a = this.tasks[i];
      const b = newTasks[i];
      if (!b) return true;
      if (
        String(a.id) !== String(b.id) ||
        a.status !== b.status ||
        a.title !== b.title ||
        a.board !== b.board ||
        Boolean(a.isStarred) !== Boolean(b.isStarred) ||
        (a.pic?.name !== b.pic?.name)
      ) {
        return true;
      }
    }
    return false;
  }

  getDeletedTaskIds() {
    try {
      const stored = localStorage.getItem('deleted_tasks');
      if (!stored) return new Set();
      const arr = JSON.parse(stored);
      return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch (e) {
      return new Set();
    }
  }

  addDeletedTaskId(id) {
    if (!id) return;
    const cleanId = String(id).trim();
    const deleted = this.getDeletedTaskIds();
    deleted.add(cleanId);
    try {
      localStorage.setItem('deleted_tasks', JSON.stringify(Array.from(deleted)));
    } catch (e) {}
  }

  removeDeletedTaskId(id) {
    if (!id) return;
    const cleanId = String(id).trim();
    const deleted = this.getDeletedTaskIds();
    deleted.delete(cleanId);
    try {
      localStorage.setItem('deleted_tasks', JSON.stringify(Array.from(deleted)));
    } catch (e) {}
  }

  getDeletedWorkspaces() {
    try {
      const stored = localStorage.getItem('deleted_workspaces');
      if (!stored) return new Set();
      const arr = JSON.parse(stored);
      return new Set(Array.isArray(arr) ? arr.map(w => String(w).toLowerCase().trim()) : []);
    } catch (e) {
      return new Set();
    }
  }

  _deduplicateTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    const deletedIds = this.getDeletedTaskIds();
    const deletedWorkspaces = this.getDeletedWorkspaces();
    const seenIds = new Set();
    const seenSignatures = new Set();
    const result = [];

    for (const t of tasks) {
      if (!t || !t.id) continue;
      const strId = String(t.id).trim();
      const strCode = t.code ? String(t.code).toUpperCase().trim() : '';
      const ws = String(t.workspace || '').toLowerCase().trim();
      const cleanWs = ws.replace(/[-_\s]+/g, '');
      const title = String(t.title || '').toLowerCase().trim().replace(/\s+/g, ' ');

      // Abaikan tugas yang sudah dihapus atau dari workspace yang telah dihapus
      if (deletedIds.has(strId) || (strCode && deletedIds.has(strCode))) continue;
      if (deletedWorkspaces.has(ws) || (t.projectId && deletedWorkspaces.has(String(t.projectId).toLowerCase().trim()))) continue;
      if (seenIds.has(strId)) continue;

      // Unique signature: (workspace + code) atau (workspace + title jika starter/auto)
      const sigCode = (cleanWs && strCode && strCode !== '#TASK') ? `${cleanWs}::c::${strCode}` : null;
      const isAutoOrStarter = strId.startsWith('task-auto-') || strId.startsWith('task-starter-') || strId.startsWith('task-pk-') || strId.startsWith('task-co-') || strId.startsWith('task-ai-') || strId.startsWith('task-sh-');
      const sigTitle = (cleanWs && title && isAutoOrStarter) ? `${cleanWs}::t::${title}` : null;

      if (sigCode && seenSignatures.has(sigCode)) continue;
      if (sigTitle && seenSignatures.has(sigTitle)) continue;

      seenIds.add(strId);
      if (sigCode) seenSignatures.add(sigCode);
      if (sigTitle) seenSignatures.add(sigTitle);
      result.push(t);
    }
    return result;
  }

  /**
   * Sinkronisasi data tugas dengan Backend (Port 5000 / LAN / Supabase / Cloud Sync)
   */
  async syncFromBackend(isSilent = false) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const deletedIds = this.getDeletedTaskIds();
    const deletedWorkspaces = this.getDeletedWorkspaces();

    try {
      let remoteTasks = null;
      if (supabaseService.isConfigured()) {
        try {
          const sbTasks = await supabaseService.getTasks();
          if (Array.isArray(sbTasks) && sbTasks.length > 0) {
            remoteTasks = sbTasks;
          }
        } catch (sbErr) {
          console.warn('[TaskService] Direct Supabase fetch tasks warning:', sbErr.message);
        }
      }

      if (!Array.isArray(remoteTasks)) {
        remoteTasks = await apiService.getTasks();
      }

      if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
        const remoteMap = new Map();
        remoteTasks.forEach(t => {
          if (!t || !t.id) return;
          const strId = String(t.id);
          const strCode = t.code ? String(t.code) : '';
          const ws = String(t.workspace || '').toLowerCase().trim();
          const pId = String(t.projectId || '').toLowerCase().trim();

          // Jangan pernah masukkan tugas yang sudah ada di daftar deleted_tasks atau deleted_workspaces
          if (deletedIds.has(strId) || (strCode && deletedIds.has(strCode)) || deletedWorkspaces.has(ws) || deletedWorkspaces.has(pId)) {
            apiService.deleteTask(strId).catch(() => {});
            return;
          }
          remoteMap.set(strId, new Task(t));
        });

        // Cari task lokal yang belum ada di remote dan jadwalkan upload, atau jika lokal lebih baru pertahankan lokal
        const localTasksToUpload = [];
        for (const localTask of this.tasks) {
          if (!localTask || !localTask.id) continue;
          const strId = String(localTask.id);
          const strCode = localTask.code ? String(localTask.code) : '';
          if (deletedIds.has(strId) || (strCode && deletedIds.has(strCode))) {
            continue;
          }

          const remoteTask = remoteMap.get(strId);
          if (!remoteTask) {
            localTasksToUpload.push(localTask);
            remoteMap.set(strId, localTask);
          } else {
            const localTime = new Date(localTask.updatedAt || localTask.createdAt || 0).getTime();
            const remoteTime = new Date(remoteTask.updatedAt || remoteTask.createdAt || 0).getTime();
            if (localTime >= remoteTime) {
              remoteMap.set(strId, localTask);
              if (localTask.status !== remoteTask.status) {
                apiService.updateTask(localTask.id, { status: localTask.status, updatedAt: localTime }).catch(() => {});
              }
            }
          }
        }

        const mergedTasks = this._deduplicateTasks(Array.from(remoteMap.values()));
        const changed = this._hasTasksChanged(mergedTasks);

        if (changed) {
          this.tasks = mergedTasks;
          this.saveToStorage();
          if (this.eventBus) {
            this.eventBus.emit('tasks:updated', this.tasks);
          }
          this.broadcastLocalChange();
          if (!isSilent) {
            console.log(`[TaskService] 🔄 Sinkronisasi otomatis: ${this.tasks.length} tugas diperbarui dari backend.`);
          }
        }

        // Upload task lokal yang belum tersimpan di remote
        if (localTasksToUpload.length > 0) {
          for (const task of localTasksToUpload) {
            try {
              await apiService.createTask(task);
            } catch (upErr) {}
          }
        }
      }
    } catch (err) {
      if (!isSilent) {
        console.warn('[TaskService] Backend sync warning:', err.message);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  loadFromStorage() {
    const deletedIds = this.getDeletedTaskIds();
    const deletedWorkspaces = this.getDeletedWorkspaces();
    try {
      // Purge old mock tasks on first load with new version
      if (localStorage.getItem('mock_tasks_purged_v5') !== 'true') {
        localStorage.removeItem('creative_office_tasks');
        localStorage.setItem('mock_tasks_purged_v5', 'true');
      }

      const stored = localStorage.getItem('creative_office_tasks');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const oldMockIds = new Set([
            'task-1', 'task-2', 'task-3', 'task-4', 'task-5',
            'task-6', 'task-7', 'task-8', 'task-9', 'task-10',
            'task-11', 'task-12', 'task-13', 'task-14', 'task-15'
          ]);

          const filtered = parsed
            .filter(t => t && !oldMockIds.has(String(t.id)))
            .map(t => new Task(t));
          this.tasks = this._deduplicateTasks(filtered);
          this.saveToStorage();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load tasks from storage:', e);
    }
    
    // Hanya inisialisasi default jika belum pernah disimpan sama sekali di browser
    if (localStorage.getItem('creative_office_tasks') === null) {
      this.initDefaultTasks();
      this.tasks = this._deduplicateTasks(this.tasks);
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('creative_office_tasks', JSON.stringify(this.tasks));
    } catch (e) {
      console.warn('Failed to save tasks to storage:', e);
    }
  }

  /**
   * Initialize default seed tasks for standard boards so fresh devices (e.g. mobile on Vercel) have active tasks
   */
  initDefaultTasks() {
    this.tasks = [
      // CreativOffice default tasks
      new Task({
        id: 'task-co-01',
        code: '#CO-101',
        title: 'Pengembangan Prototype CreativOffice Mobile & Web',
        description: 'Implementasi antarmuka eksekutif, integrasi QR barcode scanner, dan kanban task board.',
        workspace: 'creativoffice',
        board: 'creativoffice',
        status: 'in-progress',
        priority: 'High',
        pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
        timeline: '18 - 25 Sep',
        hours: 20,
        qaProgress: { passed: 3, total: 4 }
      }),
      new Task({
        id: 'task-co-02',
        code: '#CO-102',
        title: 'Integrasi Single Device Lock & Supabase Sync',
        description: 'Validasi QR Sampulkreativ, penugasan otomatis tugas, dan enkripsi token.',
        workspace: 'creativoffice',
        board: 'creativoffice',
        status: 'review-qa',
        priority: 'Critical',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
        timeline: '20 - 27 Sep',
        hours: 16,
        qaProgress: { passed: 2, total: 3 }
      }),
      new Task({
        id: 'task-co-03',
        code: '#CO-103',
        title: 'Penyusunan Manajemen Pengguna & Delegasi Tugas',
        description: 'Pengaturan penugasan peran pegawai/siswa ke kanban board masing-masing.',
        workspace: 'creativoffice',
        board: 'creativoffice',
        status: 'ready-launch',
        priority: 'Medium',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Operations Lead' },
        timeline: '22 - 28 Sep',
        hours: 14,
        qaProgress: { passed: 3, total: 3 }
      }),

      new Task({
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
        qaProgress: { passed: 2, total: 4 }
      }),
      new Task({
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
        qaProgress: { passed: 3, total: 4 }
      }),
      new Task({
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
        qaProgress: { passed: 4, total: 4 }
      }),
      new Task({
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
        qaProgress: { passed: 4, total: 4 }
      }),
      new Task({
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
        qaProgress: { passed: 0, total: 3 }
      }),

      // AIKreativ default tasks
      new Task({
        id: 'task-ai-01',
        code: '#AI-101',
        title: 'Konfigurasi Model AI & Integrasi Vision API',
        description: 'Optimasi inference prompt dan response parser untuk pipeline visual.',
        workspace: 'aikreativ',
        board: 'studio-ai',
        status: 'in-progress',
        priority: 'High',
        pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
        timeline: '18 - 24 Sep',
        hours: 20,
        qaProgress: { passed: 2, total: 4 }
      }),
      new Task({
        id: 'task-ai-02',
        code: '#AI-102',
        title: 'Implementasi Pipeline Otomasi & Webhook Server',
        description: 'Setup routing background worker dan queue microservice.',
        workspace: 'aikreativ',
        board: 'studio-ai',
        status: 'backlog',
        priority: 'Medium',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
        timeline: '20 - 26 Sep',
        hours: 15,
        qaProgress: { passed: 1, total: 3 }
      }),
      new Task({
        id: 'task-ai-03',
        code: '#AI-103',
        title: 'Audit Latensi & Quality Assurance Model AI',
        description: 'Pengujian throughput pemrosesan data di server staging.',
        workspace: 'aikreativ',
        board: 'studio-ai',
        status: 'review-qa',
        priority: 'Critical',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
        timeline: '22 - 28 Sep',
        hours: 18,
        qaProgress: { passed: 3, total: 4 }
      }),
      new Task({
        id: 'task-ai-04',
        code: '#AI-104',
        title: 'Deploy Model ke Staging & Integrasi Frontend',
        description: 'Verifikasi integrasi websocket dan update real-time antarmuka.',
        workspace: 'aikreativ',
        board: 'studio-ai',
        status: 'ready-launch',
        priority: 'High',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
        timeline: '24 - 30 Sep',
        hours: 14,
        qaProgress: { passed: 4, total: 4 }
      }),
      new Task({
        id: 'task-ai-05',
        code: '#AI-105',
        title: 'Dokumentasi SDK & Panduan Operasional Studio',
        description: 'Penyusunan handbook standar operasional dan arsitektur.',
        workspace: 'aikreativ',
        board: 'studio-ai',
        status: 'done',
        priority: 'Low',
        pic: { name: 'Dimas Anggara', initials: 'DA', role: 'Kontributor' },
        timeline: '10 - 16 Sep',
        hours: 10,
        qaProgress: { passed: 3, total: 3 }
      }),

      // Sharinginaja default tasks
      new Task({
        id: 'task-sh-01',
        code: '#SH-101',
        title: 'Kickoff & Setup Ruang Kolaborasi Tim',
        description: 'Pembagian peran anggota, jadwal deliverable, dan milestone awal.',
        workspace: 'sharinginaja',
        board: 'sprint-1',
        status: 'in-progress',
        priority: 'High',
        pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
        timeline: '18 - 25 Sep',
        hours: 16,
        qaProgress: { passed: 1, total: 3 }
      }),
      new Task({
        id: 'task-sh-02',
        code: '#SH-102',
        title: 'Penyusunan Konten Desain & Aset Grafis Promosi',
        description: 'Pembuatan variasi visual materi kampanye dan preview deliverable.',
        workspace: 'sharinginaja',
        board: 'sprint-1',
        status: 'backlog',
        priority: 'Medium',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
        timeline: '20 - 27 Sep',
        hours: 14,
        qaProgress: { passed: 0, total: 2 }
      }),
      new Task({
        id: 'task-sh-03',
        code: '#SH-103',
        title: 'Finalisasi Ulasan Mutu & Verifikasi QA',
        description: 'Uji fungsionalitas seluruh alur kerja proyek sebelum rilis.',
        workspace: 'sharinginaja',
        board: 'sprint-1',
        status: 'ready-launch',
        priority: 'Critical',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
        timeline: '25 - 30 Sep',
        hours: 12,
        qaProgress: { passed: 3, total: 3 }
      }),

      // LayarBaca default tasks
      new Task({
        id: 'task-lb-01',
        code: '#LB-101',
        title: 'Kickoff Redaksi & Kurasi Konten LayarBaca',
        description: 'Penetapan kalender publikasi, penugasan editor, dan kurasi naskah artikel.',
        workspace: 'layarbaca',
        board: 'kampanye-q3',
        status: 'in-progress',
        priority: 'High',
        pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
        timeline: '18 - 25 Sep',
        hours: 16,
        qaProgress: { passed: 1, total: 3 }
      }),
      new Task({
        id: 'task-lb-02',
        code: '#LB-102',
        title: 'Desain Tata Letak & Tipografi Media Baca',
        description: 'Penyusunan format visual bacaan yang responsif dan nyaman untuk desktop dan mobile.',
        workspace: 'layarbaca',
        board: 'kampanye-q3',
        status: 'backlog',
        priority: 'Medium',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
        timeline: '22 - 28 Sep',
        hours: 12,
        qaProgress: { passed: 0, total: 2 }
      }),
      new Task({
        id: 'task-lb-03',
        code: '#LB-103',
        title: 'Verifikasi Kualitas Publikasi & Review Akhir',
        description: 'Pemeriksaan akhir tata bahasa, format e-reader, dan persetujuan rilis.',
        workspace: 'layarbaca',
        board: 'kampanye-q3',
        status: 'ready-launch',
        priority: 'Critical',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
        timeline: '25 - 30 Sep',
        hours: 14,
        qaProgress: { passed: 3, total: 3 }
      })
    ];
  }

  /**
   * Mengimpor daftar tugas (misalnya dari payload tautan share/QR) ke dalam TaskService & localStorage
   * @param {Array<Object>} incomingTasks
   */
  importTasks(incomingTasks) {
    if (!Array.isArray(incomingTasks) || incomingTasks.length === 0) return;
    let changed = false;
    incomingTasks.forEach(raw => {
      if (!raw || !raw.id) return;
      const existingIdx = this.tasks.findIndex(t => String(t.id) === String(raw.id));
      const taskModel = new Task(raw);
      if (existingIdx !== -1) {
        this.tasks[existingIdx] = taskModel;
        changed = true;
      } else {
        this.tasks.unshift(taskModel);
        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage();
      if (this.eventBus) {
        this.eventBus.emit('tasks:updated', this.tasks);
      }
      this.broadcastLocalChange();
    }
  }

  /**
   * Get all tasks, optionally filtered by workspace, projectId, or board
   * @param {string} [workspace]
   * @param {string} [board]
   * @returns {Task[]}
   */
  getTasks(workspace = null, board = null) {
    const oldMockIds = new Set([
      'task-1', 'task-2', 'task-3', 'task-4', 'task-5',
      'task-6', 'task-7', 'task-8', 'task-9', 'task-10',
      'task-11', 'task-12', 'task-13', 'task-14', 'task-15'
    ]);
    const deletedIds = this.getDeletedTaskIds();
    const deletedWorkspaces = this.getDeletedWorkspaces();

    const dedupedAll = this._deduplicateTasks(this.tasks.filter(t => !oldMockIds.has(String(t.id))));
    let result = dedupedAll;

    if (workspace && workspace !== 'all') {
      const wsLower = workspace.toLowerCase();
      result = result.filter(t => {
        const tWs = (t.workspace || '').toLowerCase();
        const tProj = (t.projectId || '').toLowerCase();
        if (tWs === wsLower || tProj === wsLower) return true;
        if ((wsLower.includes('panen') || wsLower.includes('panan')) && (tWs.includes('panen') || tWs.includes('panan'))) return true;
        if ((wsLower.includes('creativ') || wsLower.includes('office')) && (tWs.includes('creativ') || tWs.includes('office'))) return true;
        return false;
      });
    }
    if (board) {
      result = result.filter(t => t.board && t.board.toLowerCase() === board.toLowerCase());
    }
    return result;
  }

  /**
   * Mengambil semua tugas untuk board/proyek tertentu (sinkron dengan filter KanbanBoardView)
   * @param {Object|string} projectOrId - Project object atau projectId/workspace
   * @param {string} [workspace]
   * @returns {Task[]}
   */
  getTasksForBoard(projectOrId, workspace = null) {
    let projectId = null;
    let targetWs = '';
    let projectName = '';

    if (projectOrId && typeof projectOrId === 'object') {
      projectId = projectOrId.id || projectOrId.projectId || null;
      targetWs = projectOrId.workspace || projectOrId.id || '';
      projectName = projectOrId.name || projectOrId.title || '';
    } else if (typeof projectOrId === 'string') {
      projectId = projectOrId;
      targetWs = workspace || projectOrId;
    }

    const currentWs = String(targetWs || 'workspace-utama').toLowerCase().trim();
    const projIdStr = projectId ? String(projectId).trim() : null;
    const cleanProjName = projectName ? projectName.toLowerCase().replace(/[-_\s]+/g, '') : '';

    let matched = this.getTasks().filter(t => {
      // 1. Direct projectId match
      if (projIdStr && t.projectId && String(t.projectId) === projIdStr) {
        return true;
      }
      // 2. Jika tugas terikat dengan projectId lain yang berbeda, abaikan
      if (projIdStr && t.projectId && String(t.projectId) !== projIdStr) {
        return false;
      }

      const taskWs = String(t.workspace || '').toLowerCase().trim();
      const cleanTaskWs = taskWs.replace(/[-_\s]+/g, '');

      const isPanenMatch = (currentWs.includes('panen') || currentWs.includes('panan')) && (taskWs.includes('panen') || taskWs.includes('panan'));
      const isCreativMatch = (currentWs.includes('creativ') || currentWs.includes('office')) && (taskWs.includes('creativ') || taskWs.includes('office'));
      const isNameMatch = Boolean(cleanProjName && cleanTaskWs && cleanProjName === cleanTaskWs);
      const isDirectMatch = taskWs === currentWs || isPanenMatch || isCreativMatch || isNameMatch;

      if (projIdStr) {
        return !t.projectId && isDirectMatch;
      }
      return isDirectMatch;
    });

    // Jika board belum memiliki tugas dan belum pernah diinisialisasi, buatkan starter tasks
    const initKey = `board_initialized_${currentWs}_${projIdStr || ''}`;
    const wasInitialized = localStorage.getItem(initKey) === 'true';

    // Cek apakah di database tasks sudah ada yang memiliki workspace ini
    const hasExistingInTasks = this.tasks.some(t => {
      const tWs = String(t.workspace || '').toLowerCase().trim();
      return tWs === currentWs || (currentWs.includes('creativ') && tWs.includes('creativ')) || (currentWs.includes('panen') && tWs.includes('panen'));
    });

    if (matched.length === 0 && !wasInitialized && !hasExistingInTasks && currentWs !== 'workspace-utama') {
      localStorage.setItem(initKey, 'true');
      const boardLabel = projectName || targetWs || 'Proyek';
      const cleanPrefix = (boardLabel.split(/[\s-_]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'TSK');
      const cleanWsKey = currentWs.replace(/[^a-z0-9]/g, '');
      const starterTasks = [
        new Task({
          id: `task-starter-${cleanWsKey}-1`,
          code: `#${cleanPrefix}-101`,
          title: `Kickoff & Ruang Lingkup: ${boardLabel}`,
          description: `Penetapan sasaran tim, pembagian PIC, dan alur pengerjaan papan ${boardLabel}.`,
          workspace: targetWs,
          projectId: projIdStr || targetWs,
          status: 'in-progress',
          priority: 'High',
          pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security' },
          timeline: '18 - 25 Sep',
          hours: 16,
          qaProgress: { passed: 1, total: 3 }
        }),
        new Task({
          id: `task-starter-${cleanWsKey}-2`,
          code: `#${cleanPrefix}-102`,
          title: `Penyusunan Konten & Kebutuhan Desain`,
          description: `Riset kebutuhan visual, wireframe, dan validasi aset deliverable.`,
          workspace: targetWs,
          projectId: projIdStr || targetWs,
          status: 'backlog',
          priority: 'Medium',
          pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
          timeline: '22 - 28 Sep',
          hours: 12,
          qaProgress: { passed: 0, total: 2 }
        }),
        new Task({
          id: `task-starter-${cleanWsKey}-3`,
          code: `#${cleanPrefix}-103`,
          title: `Ulasan Mutu QA & Finalisasi Deliverable`,
          description: `Pemeriksaan standar kualitas dan verifikasi sebelum persetujuan akhir.`,
          workspace: targetWs,
          projectId: projIdStr || targetWs,
          status: 'ready-launch',
          priority: 'Critical',
          pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
          timeline: '25 - 30 Sep',
          hours: 14,
          qaProgress: { passed: 3, total: 3 }
        })
      ];
      const validStarters = this._deduplicateTasks(starterTasks);
      validStarters.forEach(t => {
        const exists = this.tasks.some(x => String(x.id) === String(t.id));
        if (!exists) this.tasks.unshift(t);
      });
      this.tasks = this._deduplicateTasks(this.tasks);
      this.saveToStorage();
      matched = validStarters;
    } else {
      localStorage.setItem(initKey, 'true');
    }

    return this._deduplicateTasks(matched);
  }

  /**
   * Find a single task by ID or code
   * @param {string} idOrCode
   * @returns {Task|undefined}
   */
  getTask(idOrCode) {
    if (!idOrCode) return undefined;
    const clean = String(idOrCode).trim();
    return this.tasks.find(t => 
      String(t.id) === clean || 
      String(t.code) === clean ||
      (t.code && t.code.toLowerCase() === clean.toLowerCase())
    );
  }

  /**
   * Add a new task
   * @param {Object} taskData
   * @returns {Task}
   */
  addTask(taskData) {
    const newTask = new Task({
      id: taskData.id || 'task-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
      ...taskData
    });
    this.tasks.unshift(newTask);
    this.saveToStorage();

    // 🚀 1. Simpan langsung ke Supabase jika aktif
    if (supabaseService.isConfigured()) {
      supabaseService.createTask(newTask).then((saved) => {
        if (saved) {
          console.log(`[TaskService] ✅ Task "${newTask.title}" tersimpan langsung di Supabase (${saved.id || newTask.id})`);
        }
      }).catch(err => {
        console.warn('[TaskService] Gagal sync task ke Supabase:', err.message);
      });
    }

    // 🚀 2. Simpan ke Backend API & PostgreSQL (Port 5000 / LAN)
    apiService.createTask(newTask).then((saved) => {
      if (saved) {
        console.log(`[TaskService] ✅ Task "${newTask.title}" tersimpan di Backend (${saved.id || newTask.id})`);
      }
    }).catch(err => {
      console.warn('[TaskService] Gagal sync task ke Backend:', err.message);
    });

    this.eventBus.emit('tasks:updated', this.tasks);
    this.broadcastLocalChange();
    this.notifications.success(`Tugas "${newTask.title}" berhasil ditambahkan.`);
    return newTask;
  }

  /**
   * Delete / remove a task by ID
   * @param {string} taskId
   * @param {boolean} [silent] - whether to suppress default toast
   * @returns {{ task: Task, index: number }|null}
   */
  deleteTask(taskId, silent = false) {
    if (!taskId) return null;
    const cleanId = String(taskId).trim();
    this.addDeletedTaskId(cleanId);

    const index = this.tasks.findIndex(t => String(t.id) === cleanId || String(t.code) === cleanId);
    if (index !== -1) {
      const removed = this.tasks.splice(index, 1)[0];
      if (removed.id) this.addDeletedTaskId(removed.id);
      if (removed.code) this.addDeletedTaskId(removed.code);

      const bKey = `board_initialized_${String(removed.workspace || '').toLowerCase()}_${String(removed.projectId || '').toLowerCase()}`;
      try { localStorage.setItem(bKey, 'true'); } catch (e) {}

      this.saveToStorage();

      // 🚀 1. Hapus langsung dari Supabase jika aktif
      if (supabaseService.isConfigured()) {
        supabaseService.deleteTask(cleanId).catch(err => {
          console.warn('[TaskService] Gagal hapus task di Supabase:', err.message);
        });
      }

      // 🚀 2. Hapus dari Backend / PostgreSQL
      apiService.deleteTask(cleanId).catch(err => {
        console.warn('[TaskService] Gagal hapus task di backend:', err.message);
      });

      this.eventBus.emit('tasks:updated', this.tasks);
      this.broadcastLocalChange();
      if (!silent) {
        this.notifications.success(`Tugas "${removed.title}" berhasil dihapus.`);
      }
      return { task: removed, index };
    } else {
      if (supabaseService.isConfigured()) {
        supabaseService.deleteTask(cleanId).catch(() => {});
      }
      apiService.deleteTask(cleanId).catch(() => {});
    }
    return null;
  }

  /**
   * Restore a previously deleted task (Undo)
   * @param {Task} task
   * @param {number} [index]
   * @returns {boolean}
   */
  restoreTask(task, index = 0) {
    if (!task) return false;
    if (task.id) this.removeDeletedTaskId(task.id);
    if (task.code) this.removeDeletedTaskId(task.code);

    const insertIndex = Math.min(Math.max(0, index), this.tasks.length);
    this.tasks.splice(insertIndex, 0, task);
    this.saveToStorage();

    apiService.createTask(task).catch(() => {});

    this.eventBus.emit('tasks:updated', this.tasks);
    this.notifications.success(`Kartu "${task.title}" berhasil dipulihkan.`);
    return true;
  }

  /**
   * Restore multiple tasks (Undo)
   * @param {Array<{ task: Task, index: number }>} items
   */
  restoreTasks(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const sorted = [...items].sort((a, b) => a.index - b.index);
    sorted.forEach(({ task, index }) => {
      if (task.id) this.removeDeletedTaskId(task.id);
      if (task.code) this.removeDeletedTaskId(task.code);
      const insertIndex = Math.min(Math.max(0, index), this.tasks.length);
      this.tasks.splice(insertIndex, 0, task);
      apiService.createTask(task).catch(() => {});
    });
    this.saveToStorage();
    this.eventBus.emit('tasks:updated', this.tasks);
    this.notifications.success(`${sorted.length} kartu berhasil dipulihkan.`);
  }

  /**
   * Update task status (e.g. dragging between Kanban columns or table dropdown)
   * @param {string} taskId
   * @param {string} newStatus
   */
  updateTaskStatus(taskId, newStatus) {
    if (!taskId) return false;
    const clean = String(taskId).trim();
    // Strictly match by ID first to prevent collisions between tasks
    let task = this.tasks.find(t => String(t.id) === clean);
    if (!task) {
      task = this.tasks.find(t => t.code && String(t.code).trim().toLowerCase() === clean.toLowerCase());
    }
    if (task) {
      const oldStatus = task.status;
      task.status = newStatus;
      task.updatedAt = Date.now();
      this.saveToStorage();

      // 🚀 1. Update ke Supabase jika aktif
      if (supabaseService.isConfigured()) {
        supabaseService.updateTask(task.id, { status: newStatus, updatedAt: task.updatedAt }).catch(err => {
          console.warn('[TaskService] Gagal update status di Supabase:', err.message);
        });
      }

      // 🚀 2. Update ke Backend API
      apiService.updateTask(task.id, { status: newStatus, updatedAt: task.updatedAt }).catch(err => {
        console.warn('[TaskService] Gagal update status di Backend API:', err.message);
      });

      this.eventBus.emit('tasks:updated', this.tasks);
      this.broadcastLocalChange();
      if (this.notifications) {
        this.notifications.info(`Status ${task.code || 'tugas'} diubah: ${oldStatus} ➔ ${newStatus}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Update task title with storage & PostgreSQL sync
   * @param {string} taskId
   * @param {string} newTitle
   * @returns {boolean}
   */
  updateTaskTitle(taskId, newTitle) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && newTitle && newTitle.trim()) {
      const trimmed = newTitle.trim();
      const oldTitle = task.title;
      task.title = trimmed;
      this.saveToStorage();

      // 🚀 1. Update ke Supabase jika aktif
      if (supabaseService.isConfigured()) {
        supabaseService.updateTask(taskId, { title: trimmed }).catch(() => {});
      }

      // 🚀 2. Update ke Backend API
      apiService.updateTask(taskId, { title: trimmed }).catch(err => {
        console.warn('[TaskService] Gagal update judul tugas di Backend API:', err.message);
      });

      this.eventBus.emit('tasks:updated', this.tasks);
      this.broadcastLocalChange();
      return true;
    }
    return false;
  }

  /**
   * Update task properties (title, description, status, priority, pic, timeline, etc.)
   * @param {string} taskId
   * @param {Object} updates
   * @returns {Task|null}
   */
  updateTask(taskId, updates) {
    if (!taskId || !updates) return null;
    const cleanId = String(taskId).trim();
    let task = this.tasks.find(t => 
      String(t.id) === cleanId || 
      String(t.code) === cleanId ||
      (t.code && t.code.toLowerCase() === cleanId.toLowerCase())
    );

    if (!task) {
      task = { id: taskId, ...updates };
      this.tasks.push(task);
    } else {
      Object.assign(task, updates);
    }

    this.saveToStorage();

    // 🚀 1. Update ke Supabase jika aktif
    if (supabaseService.isConfigured()) {
      supabaseService.updateTask(task.id, updates).catch(err => {
        console.warn('[TaskService] Gagal update task di Supabase:', err.message);
      });
    }

    // 🚀 2. Update ke Backend API
    apiService.updateTask(task.id, updates).catch(err => {
      console.warn('[TaskService] Gagal update task di Backend API:', err.message);
    });

    this.eventBus.emit('tasks:updated', this.tasks);
    this.broadcastLocalChange();
    if (this.notifications) {
      this.notifications.success(`Tugas "${task.title || task.code}" berhasil diperbarui.`);
    }
    return task;
  }

  /**
   * Toggle star/favorite on a task
   * @param {string} taskId
   */
  toggleStar(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.isStarred = !task.isStarred;
      this.saveToStorage();

      apiService.updateTask(taskId, { isStarred: task.isStarred }).catch(() => {});

      this.eventBus.emit('tasks:updated', this.tasks);
      this.broadcastLocalChange();
    }
  }

  /**
   * Hapus semua tugas yang terasosiasi dengan workspace atau projectId tertentu
   * @param {string} workspaceOrProjectId
   */
  deleteWorkspaceTasks(workspaceOrProjectId) {
    if (!workspaceOrProjectId) return;
    const target = String(workspaceOrProjectId).toLowerCase().trim();
    const cleanTarget = target.replace(/[-_\s]+/g, '');

    const tasksToDelete = this.tasks.filter(t => {
      const ws = String(t.workspace || '').toLowerCase().trim();
      const cleanWs = ws.replace(/[-_\s]+/g, '');
      const pid = String(t.projectId || '').toLowerCase().trim();
      return ws === target || cleanWs === cleanTarget || pid === target;
    });

    tasksToDelete.forEach(t => {
      this.addDeletedTaskId(t.id);
      if (t.code) this.addDeletedTaskId(t.code);
      if (supabaseService.isConfigured()) {
        supabaseService.deleteTask(t.id).catch(() => {});
      }
      apiService.deleteTask(t.id).catch(() => {});
    });

    this.tasks = this.tasks.filter(t => !tasksToDelete.some(dt => dt.id === t.id));
    this.saveToStorage();
    if (this.eventBus) {
      this.eventBus.emit('tasks:updated', this.tasks);
    }
    this.broadcastLocalChange();
  }

  /**
   * Calculate summary metrics for executive dashboard
   */
  getMetrics() {
    const validTasks = this.getTasks();
    const totalActive = validTasks.filter(t => t.status !== 'done').length;
    const completed = validTasks.filter(t => t.status === 'done').length;
    const onTrackCount = validTasks.filter(t => t.status === 'in-progress' || t.status === 'ready-launch').length;
    const qaReviews = validTasks.filter(t => t.status === 'review-qa').length;
    const totalTasks = validTasks.length || 1;
    const completionPercent = Math.round((completed / totalTasks) * 100);
    const totalHours = validTasks.reduce((sum, t) => sum + (t.hours || 0), 0);

    return {
      totalActive,
      completed,
      onTrackCount,
      qaReviews,
      totalHours,
      qaPassRate: '98%',
      sprintProgress: 78,
      completionRate: `${completionPercent}%`,
      errorRate: '2.1%'
    };
  }
}
