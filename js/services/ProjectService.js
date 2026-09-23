import { Project } from '../models/Project.js';
import { apiService } from './ApiService.js';
import { supabaseService } from './SupabaseService.js';

/**
 * ProjectService - Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 * Manages project portfolio data with Supabase as the Single Source of Truth,
 * supported by Backend Express API and resilient local caching.
 */
export class ProjectService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.projects = [];
    this._isSyncing = false;

    // Load initial cache for instant UI availability
    this.loadFromStorage();

    // Fetch primary data directly from Supabase / Backend
    this.fetchProjects();

    // Setup Supabase Realtime live sync across devices
    this.setupRealtimeSync();
  }

  /**
   * Berlangganan event real-time dari Supabase PostgreSQL
   */
  setupRealtimeSync() {
    if (typeof window === 'undefined') return;

    try {
      supabaseService.subscribeToProjects((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        console.log(`[ProjectService] Realtime Event: ${eventType}`, payload);

        if (eventType === 'INSERT' && newRecord) {
          const exists = this.projects.some(p => p.id === newRecord.id);
          if (!exists) {
            this.projects.unshift(new Project(newRecord));
            this.deduplicateProjects();
            this.saveToStorage();
            if (this.eventBus) {
              this.eventBus.emit('projects:updated', this.projects);
            }
          }
        } else if (eventType === 'UPDATE' && newRecord) {
          const idx = this.projects.findIndex(p => p.id === newRecord.id);
          if (idx !== -1) {
            this.projects[idx] = new Project(newRecord);
            this.saveToStorage();
            if (this.eventBus) {
              this.eventBus.emit('projects:updated', this.projects);
            }
          }
        } else if (eventType === 'DELETE' && oldRecord) {
          const targetId = oldRecord.id;
          const idx = this.projects.findIndex(p => p.id === targetId || p.workspace === targetId);
          if (idx !== -1) {
            this.projects.splice(idx, 1);
            this.saveToStorage();
            if (this.eventBus) {
              this.eventBus.emit('projects:updated', this.projects);
            }
          }
        }
      });
    } catch (err) {
      console.warn('[ProjectService] Setup realtime notice:', err.message);
    }
  }

  /**
   * Mengambil data proyek dari Supabase sebagai Single Source of Truth
   * @returns {Promise<Project[]>}
   */
  async fetchProjects() {
    if (this._isSyncing) return this.projects;
    this._isSyncing = true;

    try {
      let remoteProjects = null;

      // 1. Coba ambil langsung dari Supabase Client jika aktif
      if (supabaseService.isConfigured()) {
        remoteProjects = await supabaseService.getProjects();
      }

      // 2. Jika Supabase client belum ada, ambil via backend API (yang tersambung ke Supabase / PostgreSQL)
      if (!Array.isArray(remoteProjects)) {
        remoteProjects = await apiService.getProjects();
      }

      // 3. Jika berhasil mendapatkan data dari server/Supabase
      if (Array.isArray(remoteProjects)) {
        this.projects = remoteProjects.map(p => new Project(p));
        this.deduplicateProjects();
        this.saveToStorage();

        if (this.eventBus) {
          this.eventBus.emit('projects:updated', this.projects);
        }
        console.log(`[ProjectService] ✅ Supabase Single Source of Truth: ${this.projects.length} papan aktif.`);
      }
    } catch (err) {
      console.warn('[ProjectService] Gagal fetch dari Supabase/Backend:', err.message);
    } finally {
      this._isSyncing = false;
    }

    return this.projects;
  }

  /**
   * Alias untuk sinkronisasi backend
   */
  async syncFromBackend() {
    return this.fetchProjects();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('creative_office_projects');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.projects = parsed.map(p => new Project(p));
          this.deduplicateProjects();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load projects from storage:', e);
    }
    this.projects = [];
  }

  deduplicateProjects() {
    if (!Array.isArray(this.projects)) return;
    const seenIds = new Set();
    const cleanList = [];

    for (const p of this.projects) {
      if (!p || (!p.id && !p.name)) continue;
      const pid = String(p.id || '').trim();
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        cleanList.push(p);
      }
    }

    if (cleanList.length !== this.projects.length) {
      this.projects = cleanList;
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('creative_office_projects', JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Failed to save projects to storage:', e);
    }
  }

  getAllProjects() {
    return [...this.projects];
  }

  getProjectsByWorkspace(workspace = null) {
    if (!workspace || workspace === 'all') return [...this.projects];
    return this.projects.filter(p => (p.workspace || '').toLowerCase() === workspace.toLowerCase());
  }

  getExistingProjects() {
    return this.projects.filter(p => p.type === 'existing');
  }

  getUpcomingProjects() {
    return this.projects.filter(p => p.type === 'upcoming');
  }

  getMetrics() {
    const total = this.projects.length;
    const existing = this.getExistingProjects().length;
    const upcoming = this.getUpcomingProjects().length;
    const completed = this.projects.filter(p => p.status === 'completed').length;
    const active = this.projects.filter(p => p.status === 'active').length;

    return { total, existing, upcoming, completed, active };
  }

  getProject(idOrCode) {
    if (!idOrCode) return undefined;
    const rawSearch = String(idOrCode).toLowerCase().trim();
    const cleanSearch = rawSearch.replace(/[^a-z0-9]/g, '');

    // 1. Direct exact match
    let match = this.projects.find(p => 
      (p.id && String(p.id).toLowerCase() === rawSearch) || 
      (p.code && String(p.code).toLowerCase() === rawSearch) || 
      (p.name && String(p.name).toLowerCase() === rawSearch) ||
      (p.workspace && String(p.workspace).toLowerCase() === rawSearch)
    );
    if (match) return match;

    // 2. Normalized alphanumeric match
    match = this.projects.find(p => {
      const pId = String(p.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pCode = String(p.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pName = String(p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pWs = String(p.workspace || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return pId === cleanSearch || pCode === cleanSearch || pName === cleanSearch || pWs === cleanSearch ||
             (pWs && (pWs.startsWith(cleanSearch) || cleanSearch.startsWith(pWs))) ||
             (pName && (pName.startsWith(cleanSearch) || cleanSearch.startsWith(pName)));
    });
    if (match) return match;

    // 3. Panen / Panan alias match
    if (cleanSearch.includes('panen') || cleanSearch.includes('panan')) {
      match = this.projects.find(p => {
        const pName = String(p.name || '').toLowerCase();
        const pWs = String(p.workspace || '').toLowerCase();
        return pName.includes('panen') || pName.includes('panan') || pWs.includes('panen') || pWs.includes('panan');
      });
      if (match) return match;
    }

    return undefined;
  }

  /**
   * Menambahkan proyek baru dan mengirimkan INSERT ke Supabase
   * Menunggu konfirmasi Supabase sebelum memasukkan ke state aplikasi
   * @param {Object} data
   * @returns {Promise<Project>}
   */
  async addProject(data = {}) {
    const newProject = new Project({
      name: data.name || 'Proyek Baru #' + Math.floor(100 + Math.random() * 900),
      code: data.code || `PRJ-N${Math.floor(10 + Math.random() * 90)}`,
      description: data.description || 'Deskripsi proyek baru di CreativeOffice.',
      workspace: data.workspace || 'ruangkreasi',
      status: data.status || (data.type === 'upcoming' ? 'planning' : 'active'),
      type: data.type || 'existing',
      progress: data.progress !== undefined ? Number(data.progress) : 0,
      priority: data.priority || 'Medium',
      startDate: data.startDate || 'Segera',
      dueDate: data.dueDate || 'Q4 2026',
      budget: data.budget || 'Rp 50.000.000',
      tasksCount: data.tasksCount || { total: 0, completed: 0 },
      theme: data.theme || null,
      isUserCreated: data.isUserCreated !== undefined ? data.isUserCreated : true
    });

    let saved = false;
    let lastError = null;

    // 1. Simpan via Supabase Client langsung jika aktif
    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.createProject(newProject);
        saved = true;
      } catch (sbErr) {
        lastError = sbErr;
        console.warn('[ProjectService] Gagal simpan ke Supabase client langsung:', sbErr.message);
      }
    }

    // 2. Simpan via backend API jika client belum simpan
    if (!saved) {
      try {
        await apiService.createProject(newProject);
        saved = true;
      } catch (apiErr) {
        lastError = apiErr;
        console.warn('[ProjectService] Gagal simpan ke Backend API:', apiErr.message);
      }
    }

    // Jika kedua jalur gagal menyimpan
    if (!saved) {
      const errMsg = lastError?.message || 'Gagal menyimpan ke Supabase maupun server backend.';
      if (this.notifications) {
        this.notifications.error(`Gagal membuat papan di Supabase: ${errMsg}`);
      }
      throw new Error(errMsg);
    }

    // INSERT Berhasil: Tambahkan ke memori & update UI
    this.projects.unshift(newProject);
    this.deduplicateProjects();
    this.saveToStorage();

    if (this.eventBus) {
      this.eventBus.emit('project:added', { project: newProject });
      this.eventBus.emit('project:created', { project: newProject });
      this.eventBus.emit('projects:updated', this.projects);
    }

    if (this.notifications) {
      this.notifications.success(`Papan proyek "${newProject.name}" berhasil tersimpan ke Supabase!`);
    }

    return newProject;
  }

  /**
   * Menghapus proyek dari Supabase berdasarkan ID atau Workspace
   * Menunggu konfirmasi Supabase sebelum memutakhirkan state aplikasi
   * @param {string} projectIdOrWorkspace
   * @returns {Promise<boolean>}
   */
  async deleteProject(projectIdOrWorkspace) {
    if (!projectIdOrWorkspace) {
      throw new Error('ID proyek tidak valid.');
    }

    const cleanTarget = String(projectIdOrWorkspace).trim();

    // Cari proyek yang sesuai di memori
    const targetIdx = this.projects.findIndex(p => 
      String(p.id || '').toLowerCase() === cleanTarget.toLowerCase() ||
      String(p.workspace || '').toLowerCase() === cleanTarget.toLowerCase()
    );

    const targetProject = targetIdx !== -1 ? this.projects[targetIdx] : null;
    const deleteId = targetProject ? targetProject.id : cleanTarget;
    const deleteWs = targetProject ? targetProject.workspace : cleanTarget;

    let deleted = false;
    let lastError = null;

    // 1. Coba hapus via Supabase Client langsung jika aktif
    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.deleteProject(deleteId);
        deleted = true;
      } catch (sbErr) {
        lastError = sbErr;
        console.warn('[ProjectService] Gagal hapus via Supabase client:', sbErr.message);
      }
    }

    // 2. Coba hapus via Backend API
    if (!deleted) {
      try {
        await apiService.deleteProject(deleteId);
        deleted = true;
      } catch (apiErr) {
        // Coba lagi dengan workspace id jika berbeda
        if (deleteWs && deleteWs !== deleteId) {
          try {
            await apiService.deleteProject(deleteWs);
            deleted = true;
          } catch (apiErr2) {
            lastError = apiErr2;
          }
        } else {
          lastError = apiErr;
        }
      }
    }

    if (!deleted) {
      const errMsg = lastError?.message || 'Gagal menghapus papan proyek dari Supabase.';
      if (this.notifications) {
        this.notifications.error(`Gagal menghapus: ${errMsg}`);
      }
      throw new Error(errMsg);
    }

    // DELETE Berhasil: Hapus dari memori & cache lokal
    if (targetIdx !== -1) {
      this.projects.splice(targetIdx, 1);
    } else {
      this.projects = this.projects.filter(p => 
        String(p.id || '').toLowerCase() !== cleanTarget.toLowerCase() &&
        String(p.workspace || '').toLowerCase() !== cleanTarget.toLowerCase()
      );
    }

    this.saveToStorage();

    if (this.eventBus) {
      this.eventBus.emit('project:deleted', { projectId: deleteId, workspace: deleteWs });
      this.eventBus.emit('workspace:deleted', { workspaceId: deleteWs || deleteId });
      this.eventBus.emit('projects:updated', this.projects);
    }

    if (this.notifications && targetProject) {
      this.notifications.success(`Papan proyek "${targetProject.name}" berhasil dihapus dari Supabase.`);
    }

    return true;
  }

  async updateProject(projectId, updates = {}) {
    const project = this.getProject(projectId);
    if (!project) return null;

    Object.assign(project, updates);
    this.saveToStorage();

    try {
      await apiService.updateProject(project.id, updates);
    } catch (e) {}

    if (this.eventBus) {
      this.eventBus.emit('project:updated', { project });
      this.eventBus.emit('projects:updated', this.projects);
    }
    return project;
  }
}
